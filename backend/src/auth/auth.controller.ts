import {
  Controller,
  Post,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  UnauthorizedException,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsString, IsOptional, MinLength, IsIn } from 'class-validator';
import { AuthService, AuthResponse } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { Request } from 'express';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(12) // Increased from 6 to 12 for better security
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
    'USD', 'LBP', 'AED', 'SAR', 'EGP', 'JOD', 'KWD', 'BHD', 'QAR', 'OMR', 'IQD', 'TND', 'MAD', 'DZD', 'LYD', 'SYP', 'TRY',
    'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'INR', 'CNY', 'KRW', 'SGD', 'HKD', 'NZD',
    'NGN', 'GHS', 'KES', 'ZAR',
    'SEK', 'NOK', 'DKK', 'PLN',
    'MXN', 'BRL', 'COP', 'ARS', 'CLP', 'PEN',
    'THB', 'IDR', 'MYR', 'PHP', 'VND',
  ])
  currency?: string;
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

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 900000 } }) // 5 attempts per 15 minutes
  async register(@Body() registerDto: RegisterDto, @Req() req: Request): Promise<AuthResponse> {
    return this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.name,
      registerDto.phoneNumber,
      req.ip || 'unknown',
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 900000 } }) // 5 attempts per 15 minutes
  async login(@Body() loginDto: LoginDto, @Req() req: Request): Promise<AuthResponse> {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      // Log failed login attempt
      await this.authService.logAuthAttempt(loginDto.email, false, req.ip || 'unknown');
      throw new UnauthorizedException('Invalid credentials');
    }
    // Log successful login
    await this.authService.logAuthAttempt(loginDto.email, true, req.ip || 'unknown');
    return this.authService.login(user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phoneNumber: user.phoneNumber,
      subscriptionTier: user.subscriptionTier,
      currency: user.currency,
      createdAt: user.createdAt,
    };
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const updated = await this.authService.updateProfile(user.id, updateProfileDto);
    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      phoneNumber: updated.phoneNumber,
      subscriptionTier: updated.subscriptionTier,
      currency: updated.currency,
      createdAt: updated.createdAt,
    };
  }

  @Post('google')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 attempts per minute
  async googleAuth(@Body() googleAuthDto: GoogleAuthDto, @Req() req: Request): Promise<AuthResponse> {
    console.log('🔵 Google auth endpoint called');
    console.log('🔵 Has idToken?', !!googleAuthDto.idToken);
    const result = await this.authService.googleLogin(googleAuthDto.idToken);
    await this.authService.logAuthAttempt(result.user.email, true, req.ip || 'unknown', 'google');
    return result;
  }

  @Post('apple')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 attempts per minute
  async appleAuth(@Body() appleAuthDto: AppleAuthDto, @Req() req: Request): Promise<AuthResponse> {
    const result = await this.authService.appleLogin(
      appleAuthDto.identityToken,
      appleAuthDto.userIdentifier,
      appleAuthDto.email,
      appleAuthDto.fullName,
    );
    await this.authService.logAuthAttempt(
      appleAuthDto.email || 'unknown',
      true,
      req.ip || 'unknown',
      'apple',
    );
    return result;
  }
}

