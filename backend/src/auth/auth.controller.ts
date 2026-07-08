import {
  Controller,
  Post,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsString, IsOptional, MinLength, IsIn, Matches } from 'class-validator';
import { AuthService, AuthResponse } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { Request } from 'express';

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(12)
  password: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class RefreshDto {
  @IsString()
  refresh_token: string;
}

export class LogoutDto {
  @IsOptional()
  @IsString()
  refresh_token?: string;
}

export class GoogleAuthDto {
  @IsString()
  idToken: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn([
    'USD', 'LBP', 'AED', 'SAR', 'EGP', 'JOD', 'KWD', 'BHD', 'QAR', 'OMR', 'IQD', 'TND', 'MAD',
    'DZD', 'LYD', 'SYP', 'TRY', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'INR', 'CNY', 'KRW',
    'SGD', 'HKD', 'NZD', 'NGN', 'GHS', 'KES', 'ZAR', 'SEK', 'NOK', 'DKK', 'PLN', 'MXN', 'BRL',
    'COP', 'ARS', 'CLP', 'PEN', 'THB', 'IDR', 'MYR', 'PHP', 'VND',
  ])
  currency?: string;

  // WhatsApp number in international E.164 form (with or without a leading '+').
  // Stored normalized to digits-only so it matches the `from` field on inbound
  // WhatsApp webhook messages, letting the WhatsApp bot find the user.
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, {
    message: 'whatsappNumber must be a valid international phone number',
  })
  whatsappNumber?: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(12)
  newPassword: string;
}

export class AppleAuthDto {
  @IsString()
  identityToken: string;

  @IsString()
  userIdentifier: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  fullName?: string;
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  // Strict: 3 registrations per hour per IP
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  async register(@Body() dto: RegisterDto, @Req() req: Request): Promise<AuthResponse> {
    return this.authService.register(
      dto.email,
      dto.password,
      dto.name,
      dto.phoneNumber,
      req.ip || 'unknown',
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  // 10 attempts per 15 minutes per IP (account lockout handles per-account brute-force)
  @Throttle({ default: { limit: 10, ttl: 900000 } })
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthResponse> {
    // validateUser throws on invalid credentials or lockout
    const user = await this.authService.validateUser(dto.email, dto.password);
    await this.authService.logAuthAttempt(dto.email, true, req.ip || 'unknown');
    return this.authService.login(user);
  }

  /**
   * Exchange a refresh token for a new access token + rotated refresh token.
   * The old refresh token is immediately invalidated (token rotation).
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  // 30 refreshes per minute per IP — generous for normal use, limits bulk abuse
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async refresh(@Body() dto: RefreshDto): Promise<{ access_token: string; refresh_token: string }> {
    return this.authService.refreshAccessToken(dto.refresh_token);
  }

  /**
   * Revoke the supplied refresh token, effectively logging the user out
   * on all devices that share this token.
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: LogoutDto): Promise<void> {
    await this.authService.logout(dto.refresh_token);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phoneNumber: user.phoneNumber,
      whatsappNumber: user.whatsappNumber,
      subscriptionTier: user.subscriptionTier,
      isAdmin: user.isAdmin,
      currency: user.currency,
      createdAt: user.createdAt,
    };
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    const updated = await this.authService.updateProfile(user.id, dto);
    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      phoneNumber: updated.phoneNumber,
      whatsappNumber: updated.whatsappNumber,
      subscriptionTier: updated.subscriptionTier,
      currency: updated.currency,
      createdAt: updated.createdAt,
    };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user: User,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }

  @Post('google')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async googleAuth(@Body() dto: GoogleAuthDto, @Req() req: Request): Promise<AuthResponse> {
    const result = await this.authService.googleLogin(dto.idToken);
    await this.authService.logAuthAttempt(result.user.email, true, req.ip || 'unknown', 'google');
    return result;
  }

  @Post('apple')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async appleAuth(@Body() dto: AppleAuthDto, @Req() req: Request): Promise<AuthResponse> {
    const result = await this.authService.appleLogin(
      dto.identityToken,
      dto.userIdentifier,
      dto.email,
      dto.fullName,
    );
    await this.authService.logAuthAttempt(
      dto.email || 'unknown',
      true,
      req.ip || 'unknown',
      'apple',
    );
    return result;
  }
}
