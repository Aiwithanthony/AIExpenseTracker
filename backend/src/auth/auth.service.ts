import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';

// Account lockout constants
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Refresh token constants
const REFRESH_TOKEN_BYTES = 64;
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface JwtPayload {
  sub: string; // user id
  email: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  /** True when this call just created the account — the client shows the
   *  one-time "set up your profile" step (name + currency). */
  isNewUser?: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    subscriptionTier: string;
    currency: string;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private googleClient: OAuth2Client;
  /** All accepted Google id_token audiences (web + iOS + Android OAuth clients). */
  private googleAudiences: string[] = [];
  private appleJwksClient: jwksClient.JwksClient;

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokensRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    // Accept id_tokens from any of our Google OAuth clients. Native builds use
    // the iOS/Android clients (whose id_tokens carry those client IDs as `aud`),
    // while Expo Go / web use the web client.
    this.googleAudiences = [
      googleClientId,
      this.configService.get<string>('GOOGLE_IOS_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_ANDROID_CLIENT_ID'),
    ].filter((id): id is string => !!id);

    if (googleClientId) {
      this.googleClient = new OAuth2Client(googleClientId);
    }

    this.appleJwksClient = jwksClient({
      jwksUri: 'https://appleid.apple.com/auth/keys',
      cache: true,
      cacheMaxAge: 86400000,
    });
  }

  // ---------------------------------------------------------------------------
  // Core helpers
  // ---------------------------------------------------------------------------

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /** Issue a signed access token (short-lived). */
  private signAccessToken(user: User): string {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return this.jwtService.sign(payload);
  }

  /** Persist a new refresh token and return the raw (unhashed) value. */
  private async createRefreshToken(userId: string): Promise<string> {
    const raw = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const tokenHash = this.hashToken(raw);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    const entity = this.refreshTokensRepository.create({ userId, tokenHash, expiresAt, revokedAt: null });
    await this.refreshTokensRepository.save(entity);

    return raw;
  }

  /** Build a full AuthResponse for a user. */
  private async buildAuthResponse(user: User, isNewUser = false): Promise<AuthResponse> {
    const access_token = this.signAccessToken(user);
    const refresh_token = await this.createRefreshToken(user.id);

    return {
      access_token,
      refresh_token,
      ...(isNewUser && { isNewUser: true }),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        subscriptionTier: user.subscriptionTier,
        currency: user.currency,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Refresh tokens
  // ---------------------------------------------------------------------------

  /**
   * Exchange a valid refresh token for a new access token + rotated refresh token.
   * The old refresh token is revoked immediately (token rotation — prevents replay).
   */
  async refreshAccessToken(rawToken: string): Promise<{ access_token: string; refresh_token: string }> {
    const tokenHash = this.hashToken(rawToken);

    const stored = await this.refreshTokensRepository.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (stored.revokedAt) {
      // Possible token reuse — revoke ALL tokens for this user as a precaution
      await this.revokeAllUserRefreshTokens(stored.userId);
      this.logger.warn(`Refresh token reuse detected for user ${stored.userId}`);
      throw new UnauthorizedException('Refresh token already revoked');
    }
    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Revoke old token
    stored.revokedAt = new Date();
    await this.refreshTokensRepository.save(stored);

    // Issue new pair
    const access_token = this.signAccessToken(stored.user);
    const refresh_token = await this.createRefreshToken(stored.userId);

    return { access_token, refresh_token };
  }

  /** Revoke a specific refresh token on logout. */
  async revokeRefreshToken(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    const stored = await this.refreshTokensRepository.findOne({ where: { tokenHash } });
    if (stored && !stored.revokedAt) {
      stored.revokedAt = new Date();
      await this.refreshTokensRepository.save(stored);
    }
  }

  /** Revoke all refresh tokens for a user (security incident response). */
  private async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await this.refreshTokensRepository
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: new Date() })
      .where('userId = :userId AND revokedAt IS NULL', { userId })
      .execute();
  }

  // ---------------------------------------------------------------------------
  // Account lockout
  // ---------------------------------------------------------------------------

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { email } });

    if (!user || !user.passwordHash) {
      // Constant-time guard: don't short-circuit before bcrypt to prevent timing attacks
      await bcrypt.compare(password, '$2b$10$invalidhashpadding000000000000000000000000000000000000000');
      throw new UnauthorizedException('Invalid credentials');
    }

    // --- Lockout check ---
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 60000);
      this.logger.warn(`Login blocked — account locked: email=${email}, unlocks_in=${minutesLeft}m`);
      throw new HttpException(
        `Account temporarily locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      // Increment failure counter
      user.failedLoginAttempts = (user.failedLoginAttempts ?? 0) + 1;

      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        this.logger.warn(
          `Account locked after ${user.failedLoginAttempts} failures: email=${email}`,
        );
      }

      await this.usersRepository.save(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    // --- Successful auth: reset lockout state ---
    if (user.failedLoginAttempts > 0 || user.lockoutUntil) {
      user.failedLoginAttempts = 0;
      user.lockoutUntil = null;
      await this.usersRepository.save(user);
    }

    return user;
  }

  // ---------------------------------------------------------------------------
  // Auth flows
  // ---------------------------------------------------------------------------

  async login(user: User): Promise<AuthResponse> {
    return this.buildAuthResponse(user);
  }

  async register(
    email: string,
    password: string,
    name: string | undefined,
    phoneNumber: string | undefined,
    ipAddress: string,
  ): Promise<AuthResponse> {
    const existingUser = await this.usersRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new UnauthorizedException('Registration failed');
    }

    const saltRounds = 12; // Increased from 10 for stronger hashing
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Name is optional at signup — the post-signup profile step collects it.
    // Fall back to a capitalized email prefix so the account is never nameless.
    const prefix = email.split('@')[0];
    const displayName =
      (name || '').trim() || prefix.charAt(0).toUpperCase() + prefix.slice(1);

    const user = this.usersRepository.create({
      email,
      passwordHash,
      name: displayName,
      phoneNumber,
    });

    const savedUser = await this.usersRepository.save(user);
    this.logger.log(`User registered: email=${email}, ip=${ipAddress}`);

    return this.buildAuthResponse(savedUser, true);
  }

  /**
   * Change the signed-in user's password. Verifies the current password first.
   * For OAuth-only accounts (no password set), the current-password check is
   * skipped so they can set a password for the first time.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.passwordHash) {
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) {
        throw new UnauthorizedException('Current password is incorrect');
      }
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await this.usersRepository.save(user);

    // Invalidate all existing refresh tokens so other sessions must re-login.
    await this.refreshTokensRepository.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );

    this.logger.log(`Password changed for user ${userId}`);
  }

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (rawRefreshToken) {
      await this.revokeRefreshToken(rawRefreshToken);
    }
  }

  async logAuthAttempt(
    email: string,
    success: boolean,
    ipAddress: string,
    method: string = 'email',
  ): Promise<void> {
    if (success) {
      this.logger.log(`Auth success: method=${method}, email=${email}, ip=${ipAddress}`);
    } else {
      this.logger.warn(`Auth failure: method=${method}, email=${email}, ip=${ipAddress}`);
    }
  }

  async updateProfile(
    userId: string,
    updateDto: { name?: string; currency?: string; whatsappNumber?: string },
  ): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (updateDto.name !== undefined) user.name = updateDto.name;
    if (updateDto.currency !== undefined) user.currency = updateDto.currency;
    if (updateDto.whatsappNumber !== undefined) {
      // Normalize to digits only so it matches WhatsApp's inbound `from` format.
      user.whatsappNumber = updateDto.whatsappNumber.replace(/\D/g, '');
    }
    return this.usersRepository.save(user);
  }

  async validateJwtPayload(payload: JwtPayload): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  async googleLogin(idToken: string): Promise<AuthResponse> {
    try {
      this.logger.log('Google login attempt received');

      if (!this.googleClient) {
        throw new UnauthorizedException('Google OAuth not configured');
      }

      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.googleAudiences,
      });

      const payload = ticket.getPayload();
      if (!payload) throw new UnauthorizedException('Invalid Google token');

      const email = payload.email;
      if (!email) throw new UnauthorizedException('Email not provided by Google');

      const name = payload.name || payload.given_name || 'User';
      const googleId = payload.sub;

      let user = await this.usersRepository.findOne({ where: { email } });
      const isNewUser = !user;

      if (!user) {
        user = this.usersRepository.create({
          email,
          name,
          passwordHash: '',
          authProvider: 'google',
          externalId: googleId,
        });
        user = await this.usersRepository.save(user);
      } else if (user.authProvider !== 'google') {
        user.authProvider = 'google';
        user.externalId = googleId;
        await this.usersRepository.save(user);
      }

      this.logger.log(`Google login successful: ${user.email}`);
      return this.buildAuthResponse(user, isNewUser);
    } catch (error: any) {
      this.logger.error(`Google authentication failed: ${error.message}`, error.stack);
      throw new UnauthorizedException('Google authentication failed');
    }
  }

  async appleLogin(
    identityToken: string,
    userIdentifier: string,
    email?: string,
    fullName?: string,
  ): Promise<AuthResponse> {
    try {
      this.logger.log('Apple login attempt received');

      const payload = await this.verifyAppleToken(identityToken);

      const appleEmail = email || payload.email;
      if (!appleEmail) throw new UnauthorizedException('Email not provided by Apple');

      const name = fullName || (payload as any).name || 'User';
      const appleId = payload.sub;

      let user = await this.usersRepository.findOne({ where: { email: appleEmail } });
      const isNewUser = !user;

      if (!user) {
        user = this.usersRepository.create({
          email: appleEmail,
          name,
          passwordHash: '',
          authProvider: 'apple',
          externalId: appleId,
        });
        user = await this.usersRepository.save(user);
      } else if (user.authProvider !== 'apple') {
        user.authProvider = 'apple';
        user.externalId = appleId;
        await this.usersRepository.save(user);
      }

      this.logger.log(`Apple login successful: ${user.email}`);
      return this.buildAuthResponse(user, isNewUser);
    } catch (error: any) {
      this.logger.error(`Apple authentication failed: ${error.message}`, error.stack);
      throw new UnauthorizedException('Apple authentication failed');
    }
  }

  private async verifyAppleToken(identityToken: string): Promise<jwt.JwtPayload> {
    const decodedToken = jwt.decode(identityToken, { complete: true });
    if (!decodedToken || !decodedToken.header || !decodedToken.header.kid) {
      throw new UnauthorizedException('Invalid Apple token format');
    }

    const kid = decodedToken.header.kid;
    const signingKey = await this.appleJwksClient.getSigningKey(kid);
    const publicKey = signingKey.getPublicKey();
    const appleBundleId =
      this.configService.get<string>('APPLE_BUNDLE_ID') || 'com.expensetracker.app';

    const payload = jwt.verify(identityToken, publicKey, {
      algorithms: ['RS256'],
      issuer: 'https://appleid.apple.com',
      audience: appleBundleId,
    });

    if (typeof payload === 'string') throw new UnauthorizedException('Invalid Apple token payload');
    return payload;
  }
}
