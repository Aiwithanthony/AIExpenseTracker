import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, SubscriptionStatus } from '../entities/subscription.entity';
import { User, SubscriptionTier } from '../entities/user.entity';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionsRepository: Repository<Subscription>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(userId: string, tier: SubscriptionTier): Promise<Subscription> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if subscription exists
    let subscription = await this.subscriptionsRepository.findOne({
      where: { userId },
    });

    const now = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1); // 1 month subscription

    if (subscription) {
      subscription.tier = tier;
      subscription.status = SubscriptionStatus.ACTIVE;
      subscription.currentPeriodStart = now;
      subscription.currentPeriodEnd = periodEnd;
      subscription.cancelAtPeriodEnd = false;
    } else {
      subscription = this.subscriptionsRepository.create({
        userId,
        tier,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      });
    }

    // Update user subscription tier
    user.subscriptionTier = tier;
    user.subscriptionExpiresAt = periodEnd;
    await this.usersRepository.save(user);

    return this.subscriptionsRepository.save(subscription);
  }

  async findOne(userId: string): Promise<Subscription | null> {
    return this.subscriptionsRepository.findOne({
      where: { userId },
      relations: ['user'],
    });
  }

  async cancel(userId: string): Promise<Subscription> {
    const subscription = await this.findOne(userId);
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    subscription.cancelAtPeriodEnd = true;
    return this.subscriptionsRepository.save(subscription);
  }

  async reactivate(userId: string): Promise<Subscription> {
    const subscription = await this.findOne(userId);
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    subscription.cancelAtPeriodEnd = false;
    subscription.status = SubscriptionStatus.ACTIVE;
    return this.subscriptionsRepository.save(subscription);
  }

  async checkSubscriptionStatus(userId: string): Promise<{
    hasActiveSubscription: boolean;
    tier: SubscriptionTier;
    expiresAt?: Date;
  }> {
    // findOne already loads the user relation — no need for a separate query
    const subscription = await this.findOne(userId);

    if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
      return {
        hasActiveSubscription: false,
        tier: SubscriptionTier.FREE,
      };
    }

    const now = new Date();
    const isExpired = subscription.currentPeriodEnd < now;

    if (isExpired) {
      // Downgrade to free
      if (subscription.user) {
        subscription.user.subscriptionTier = SubscriptionTier.FREE;
        await this.usersRepository.save(subscription.user);
      }
      subscription.status = SubscriptionStatus.CANCELED;
      await this.subscriptionsRepository.save(subscription);

      return {
        hasActiveSubscription: false,
        tier: SubscriptionTier.FREE,
      };
    }

    return {
      hasActiveSubscription: true,
      tier: subscription.tier,
      expiresAt: subscription.currentPeriodEnd,
    };
  }

  async hasPremiumAccess(userId: string): Promise<boolean> {
    const status = await this.checkSubscriptionStatus(userId);
    return status.hasActiveSubscription && status.tier === SubscriptionTier.PREMIUM;
  }
}

