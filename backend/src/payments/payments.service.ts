import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { Payment, PaymentMethod, PaymentStatus } from '../entities/payment.entity';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { SubscriptionTier } from '../entities/user.entity';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    private subscriptionsService: SubscriptionsService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey, { apiVersion: '2025-12-15.clover' });
    }
  }

  async createStripeSubscription(
    userId: string,
    tier: SubscriptionTier,
  ): Promise<{ clientSecret: string; subscriptionId: string }> {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    // Create or retrieve customer
    const customer = await this.stripe.customers.create({
      metadata: { userId },
    });

    // Create subscription
    const priceId = this.getPriceId(tier);
    const subscription = await this.stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice & {
      payment_intent?: string | Stripe.PaymentIntent;
    };
    
    let paymentIntent: Stripe.PaymentIntent;
    const paymentIntentId = typeof invoice.payment_intent === 'string' 
      ? invoice.payment_intent 
      : invoice.payment_intent?.id;
    
    if (!paymentIntentId) {
      throw new Error('Payment intent not found in invoice');
    }
    
    if (typeof invoice.payment_intent === 'string') {
      paymentIntent = await this.stripe.paymentIntents.retrieve(invoice.payment_intent);
    } else if (invoice.payment_intent) {
      paymentIntent = invoice.payment_intent;
    } else {
      paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    }

    // Save payment record
    await this.paymentsRepository.save({
      userId,
      amount: (invoice.amount_due || 0) / 100, // Convert from cents
      currency: invoice.currency || 'usd',
      status: PaymentStatus.PENDING,
      paymentMethod: PaymentMethod.STRIPE,
      stripePaymentId: paymentIntent.id,
      subscriptionId: subscription.id,
    });
    
    return {
      clientSecret: paymentIntent.client_secret || '',
      subscriptionId: subscription.id,
    };
  }

  async handleStripeWebhook(payload: any, signature: string) {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      this.logger.error('Webhook signature verification failed', err);
      throw err;
    }

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
    }
  }

  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    const payment = await this.paymentsRepository.findOne({
      where: { stripePaymentId: paymentIntent.id },
    });

    if (payment) {
      payment.status = PaymentStatus.COMPLETED;
      await this.paymentsRepository.save(payment);

      // Activate subscription
      if (payment.subscriptionId) {
        // Find user from payment
        const subscription = await this.subscriptionsService.findOne(payment.userId);
        if (subscription) {
          // Subscription already created, just ensure it's active
        }
      }
    }
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const payment = await this.paymentsRepository.findOne({
      where: { stripePaymentId: paymentIntent.id },
    });

    if (payment) {
      payment.status = PaymentStatus.FAILED;
      await this.paymentsRepository.save(payment);
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    // Update subscription in database
    this.logger.log(`Subscription updated: ${subscription.id}`);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    // Cancel subscription in database
    this.logger.log(`Subscription deleted: ${subscription.id}`);
  }

  private getPriceId(tier: SubscriptionTier): string {
    // These should be configured in Stripe dashboard
    const priceIds = {
      [SubscriptionTier.PREMIUM]: this.configService.get<string>('STRIPE_PREMIUM_PRICE_ID') || '',
    };
    return priceIds[tier] || '';
  }

  // Whish wallet integration (placeholder)
  async createWhishPayment(
    userId: string,
    amount: number,
    currency: string,
  ): Promise<{ paymentId: string; redirectUrl?: string }> {
    // TODO: Implement whish wallet integration when API documentation is available
    this.logger.warn('Whish wallet integration not yet implemented');
    
    // Placeholder implementation
    const payment = this.paymentsRepository.create({
      userId,
      amount,
      currency,
      status: PaymentStatus.PENDING,
      paymentMethod: PaymentMethod.WHISH,
    });

    const saved = await this.paymentsRepository.save(payment);
    return {
      paymentId: saved.id,
      redirectUrl: 'https://whish.payment.url', // Placeholder
    };
  }
}

