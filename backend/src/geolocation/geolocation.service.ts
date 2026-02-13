import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  timestamp: Date;
}

export interface LocationRule {
  userId: string;
  locationType: 'coffee_shop' | 'restaurant' | 'grocery' | 'mall' | 'supermarket' | 'custom';
  latitude: number;
  longitude: number;
  radius: number; // in meters
  minTimeSpent: number; // in minutes
  enabled: boolean;
}

@Injectable()
export class GeolocationService {
  private readonly logger = new Logger(GeolocationService.name);
  private readonly locationRules: Map<string, LocationRule[]> = new Map();

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
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
   * Check if location matches a known place type
   */
  async checkLocationType(
    latitude: number,
    longitude: number,
  ): Promise<string | null> {
    // TODO: Integrate with Google Places API or similar to detect location type
    // For now, return null - this would be implemented with a places API
    return null;
  }

  /**
   * Create a location rule for expense reminders
   */
  async createLocationRule(userId: string, rule: Omit<LocationRule, 'userId'>): Promise<LocationRule> {
    const fullRule: LocationRule = {
      ...rule,
      userId,
    };

    const userRules = this.locationRules.get(userId) || [];
    userRules.push(fullRule);
    this.locationRules.set(userId, userRules);

    return fullRule;
  }

  /**
   * Get location rules for a user
   */
  async getLocationRules(userId: string): Promise<LocationRule[]> {
    return this.locationRules.get(userId) || [];
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
   * Track user location entry (called from mobile app)
   */
  async trackLocationEntry(userId: string, location: LocationData): Promise<void> {
    // Store location entry timestamp
    // In production, you'd store this in a database table
    this.logger.log(`Location entry tracked for user ${userId} at ${location.latitude}, ${location.longitude}`);
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
    const locationType = await this.checkLocationType(location.latitude, location.longitude);

    return {
      shouldRemind,
      locationType: locationType || undefined,
    };
  }
}

