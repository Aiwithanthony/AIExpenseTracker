import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LocationRule } from '../entities/location-rule.entity';

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  timestamp: Date;
}

export interface CreateLocationRuleInput {
  name?: string;
  locationType: LocationRule['locationType'];
  latitude: number;
  longitude: number;
  radius: number; // meters
  minTimeSpent: number; // minutes
  enabled: boolean;
}

@Injectable()
export class GeolocationService {
  private readonly logger = new Logger(GeolocationService.name);

  constructor(
    @InjectRepository(LocationRule)
    private locationRulesRepository: Repository<LocationRule>,
  ) {}

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Check if location matches a known place type.
   * Placeholder until a Places API (e.g. Google Places) is wired in.
   */
  async checkLocationType(
    _latitude: number,
    _longitude: number,
  ): Promise<string | null> {
    return null;
  }

  /**
   * Create a persisted location rule for expense reminders.
   */
  async createLocationRule(
    userId: string,
    input: CreateLocationRuleInput,
  ): Promise<LocationRule> {
    const rule = this.locationRulesRepository.create({
      userId,
      name: input.name ?? '',
      locationType: input.locationType,
      latitude: input.latitude,
      longitude: input.longitude,
      radius: input.radius,
      minTimeSpent: input.minTimeSpent,
      enabled: input.enabled,
    });
    return this.locationRulesRepository.save(rule);
  }

  /**
   * Get location rules for a user.
   */
  async getLocationRules(userId: string): Promise<LocationRule[]> {
    return this.locationRulesRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateLocationRule(
    userId: string,
    id: string,
    updates: Partial<CreateLocationRuleInput>,
  ): Promise<LocationRule> {
    const rule = await this.locationRulesRepository.findOne({
      where: { id, userId },
    });
    if (!rule) {
      throw new NotFoundException('Location rule not found');
    }
    Object.assign(rule, updates);
    return this.locationRulesRepository.save(rule);
  }

  async deleteLocationRule(userId: string, id: string): Promise<void> {
    const result = await this.locationRulesRepository.delete({ id, userId });
    if (!result.affected) {
      throw new NotFoundException('Location rule not found');
    }
  }

  /**
   * Check if user should receive expense reminder based on location
   */
  async shouldSendReminder(
    userId: string,
    location: LocationData,
    timeSpent: number, // in minutes
  ): Promise<boolean> {
    const rules = await this.getLocationRules(userId);

    for (const rule of rules) {
      if (!rule.enabled) continue;

      const distance = this.calculateDistance(
        rule.latitude,
        rule.longitude,
        location.latitude,
        location.longitude,
      );

      // Check if within radius and spent enough time
      if (distance <= rule.radius && timeSpent >= rule.minTimeSpent) {
        return true;
      }
    }

    return false;
  }

  /**
   * Track user location entry (called from mobile app).
   * Entry/exit timing is currently computed client-side and passed to
   * trackLocationExit; we simply log entries server-side.
   */
  async trackLocationEntry(userId: string, location: LocationData): Promise<void> {
    this.logger.log(
      `Location entry tracked for user ${userId} at ${location.latitude}, ${location.longitude}`,
    );
  }

  /**
   * Track user location exit and check if reminder needed
   */
  async trackLocationExit(
    userId: string,
    location: LocationData,
    entryTime: Date,
  ): Promise<{ shouldRemind: boolean; locationType?: string }> {
    const exitTime = location.timestamp;
    const timeSpent = (exitTime.getTime() - entryTime.getTime()) / (1000 * 60); // minutes

    const shouldRemind = await this.shouldSendReminder(userId, location, timeSpent);
    const locationType = await this.checkLocationType(
      location.latitude,
      location.longitude,
    );

    return {
      shouldRemind,
      locationType: locationType || undefined,
    };
  }
}
