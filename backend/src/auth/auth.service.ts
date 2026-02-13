import { Injectable, UnauthorizedException, NotFoundException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { User } from '../entities/user.entity';

export interface JwtPayload {
  sub: string; // user id
  email: string;
}

export interface AuthResponse {
  access_token: string;
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
  private appleJwksClient: jwksClient.JwksClient;

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    // Initialize Google OAuth client
    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (googleClientId) {
      this.googleClient = new OAuth2Client(googleClientId);
    }

    // Initialize Apple JWKS client for token verification
    this.appleJwksClient = jwksClient({
      jwksUri: 'https://appleid.apple.com/auth/keys',
      cache: true,
      cacheMaxAge: 86400000, // 24 hours
    });
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async login(user: User): Promise<AuthResponse> {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        subscriptionTier: user.subscriptionTier,
        currency: user.currency,
      },
    };
  }

  async register(
    email: string,
    password: string,
    name: string,
    phoneNumber: string | undefined,
    ipAddress: string,
  ): Promise<AuthResponse> {
    // Check if user exists
    const existingUser = await this.usersRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      // Generic error message to prevent email enumeration
      throw new UnauthorizedException('Registration failed');
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = this.usersRepository.create({
      email,
      passwordHash,
      name,
      phoneNumber,
    });

    const savedUser = await this.usersRepository.save(user);
    
    // Log successful registration
    this.logger.log(`User registered: email=${email}, ip=${ipAddress}`);
    
    return this.login(savedUser);
  }

  /**
   * Log authentication attempts for security auditing
   */
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

  async updateProfile(userId: string, updateDto: { name?: string; currency?: string }): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (updateDto.name !== undefined) user.name = updateDto.name;
    if (updateDto.currency !== undefined) user.currency = updateDto.currency;
    return this.usersRepository.save(user);
  }

  async validateJwtPayload(payload: JwtPayload): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  async googleLogin(idToken: string): Promise<AuthResponse> {
    try {
      this.logger.log('🔵 Google login attempt received');
      
      if (!this.googleClient) {
        this.logger.error('❌ Google OAuth client not configured');
        throw new UnauthorizedException('Google OAuth not configured');
      }

      this.logger.log('🔵 Verifying Google ID token...');
      // Verify Google ID token
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      });

      const payload = ticket.getPayload();
      if (!payload) {
        this.logger.error('❌ Google token verification failed: no payload');
        throw new UnauthorizedException('Invalid Google token');
      }

      this.logger.log(`✅ Google token verified for email: ${payload.email || 'no email'}`);
      
      const email = payload.email;
      if (!email) {
        this.logger.error('❌ Google token missing email');
        throw new UnauthorizedException('Email not provided by Google');
      }

      const name = payload.name || payload.given_name || 'User';
      const googleId = payload.sub;

      // Find or create user
      let user = await this.usersRepository.findOne({
        where: { email },
      });

      if (!user) {
        // Create new user
        user = this.usersRepository.create({
          email,
          name,
          passwordHash: '', // No password for OAuth users
          authProvider: 'google',
          externalId: googleId,
        });
        user = await this.usersRepository.save(user);
      } else if (user.authProvider !== 'google') {
        // Link Google account to existing user
        user.authProvider = 'google';
        user.externalId = googleId;
        await this.usersRepository.save(user);
      }

      this.logger.log(`✅ Google login successful for user: ${user.email}`);
      return this.login(user);
    } catch (error: any) {
      this.logger.error(`❌ Google authentication failed: ${error.message || error}`, error.stack);
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
      this.logger.log('🍎 Apple login attempt received');

      // Verify Apple identity token cryptographically
      const payload = await this.verifyAppleToken(identityToken);

      const appleEmail = email || payload.email;
      if (!appleEmail) {
        this.logger.error('❌ Apple token missing email');
        throw new UnauthorizedException('Email not provided by Apple');
      }

      this.logger.log(`✅ Apple token verified for email: ${appleEmail}`);

      const name = fullName || (payload as any).name || 'User';
      const appleId = payload.sub;

      // Find or create user
      let user = await this.usersRepository.findOne({
        where: { email: appleEmail },
      });

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

      this.logger.log(`✅ Apple login successful for user: ${user.email}`);
      return this.login(user);
    } catch (error: any) {
      this.logger.error(`❌ Apple authentication failed: ${error.message || error}`, error.stack);
      throw new UnauthorizedException('Apple authentication failed');
    }
  }

  /**
   * Verify Apple identity token using Apple's public keys (JWKS)
   */
  private async verifyAppleToken(identityToken: string): Promise<jwt.JwtPayload> {
    // Decode the token header to get the key ID (kid)
    const decodedToken = jwt.decode(identityToken, { complete: true });
    if (!decodedToken || !decodedToken.header || !decodedToken.header.kid) {
      throw new UnauthorizedException('Invalid Apple token format');
    }

    const kid = decodedToken.header.kid;

    // Get the signing key from Apple's JWKS endpoint
    const signingKey = await this.appleJwksClient.getSigningKey(kid);
    const publicKey = signingKey.getPublicKey();

    // Get the Apple Bundle ID from config (audience for verification)
    const appleBundleId = this.configService.get<string>('APPLE_BUNDLE_ID') || 'com.expensetracker.app';

    // Verify the token cryptographically
    const payload = jwt.verify(identityToken, publicKey, {
      algorithms: ['RS256'],
      issuer: 'https://appleid.apple.com',
      audience: appleBundleId,
    });

    if (typeof payload === 'string') {
      throw new UnauthorizedException('Invalid Apple token payload');
    }

    return payload;
  }
}

