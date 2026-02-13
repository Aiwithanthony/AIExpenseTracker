import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { IsNumber, IsOptional, IsString, IsDateString, IsEnum, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { GeolocationService, LocationData, LocationRule } from './geolocation.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';

export class TrackLocationDto {
  @Type(() => Number)
  @IsNumber()
  latitude: number;

  @Type(() => Number)
  @IsNumber()
  longitude: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsDateString()
  timestamp?: Date;
}

export class TrackLocationExitDto extends TrackLocationDto {
  @IsDateString()
  entryTime: Date;
}

export class CreateLocationRuleDto {
  @IsEnum(['coffee_shop', 'restaurant', 'grocery', 'mall', 'supermarket', 'custom'])
  locationType: 'coffee_shop' | 'restaurant' | 'grocery' | 'mall' | 'supermarket' | 'custom';

  @Type(() => Number)
  @IsNumber()
  latitude: number;

  @Type(() => Number)
  @IsNumber()
  longitude: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  radius: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minTimeSpent: number;

  @Type(() => Boolean)
  @IsBoolean()
  enabled: boolean;
}

@Controller('geolocation')
@UseGuards(JwtAuthGuard)
export class GeolocationController {
  constructor(private readonly geolocationService: GeolocationService) {}

  @Post('track-entry')
  async trackEntry(
    @CurrentUser() user: User,
    @Body() dto: TrackLocationDto,
  ) {
    const location: LocationData = {
      latitude: dto.latitude,
      longitude: dto.longitude,
      address: dto.address,
      timestamp: dto.timestamp || new Date(),
    };
    await this.geolocationService.trackLocationEntry(user.id, location);
    return { success: true };
  }

  @Post('track-exit')
  async trackExit(
    @CurrentUser() user: User,
    @Body() dto: TrackLocationExitDto,
  ) {
    const location: LocationData = {
      latitude: dto.latitude,
      longitude: dto.longitude,
      address: dto.address,
      timestamp: dto.timestamp || new Date(),
    };
    const result = await this.geolocationService.trackLocationExit(
      user.id,
      location,
      dto.entryTime,
    );
    return result;
  }

  @Post('rules')
  async createRule(
    @CurrentUser() user: User,
    @Body() dto: CreateLocationRuleDto,
  ) {
    return this.geolocationService.createLocationRule(user.id, dto);
  }

  @Get('rules')
  async getRules(@CurrentUser() user: User) {
    return this.geolocationService.getLocationRules(user.id);
  }
}

