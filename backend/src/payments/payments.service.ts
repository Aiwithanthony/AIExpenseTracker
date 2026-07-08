import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { Payment, PaymentMethod, PaymentStatus } from '../entities/payment.entity';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { SubscriptionStatus } from '../entities/subscription.entity';
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

    const customer = await this.getOrCreateCustomer(userId);

    // Create subscription
    const priceId = this.getPriceId(tier);
    if (!priceId) {
      throw new Error(
        'STRIPE_PREMIUM_PRICE_ID is not configured. Set it to your Stripe Price ID.',
      );
    }
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

  /** Reuse this user's Stripe customer if one exists (by userId metadata), else create one. */
  private async getOrCreateCustomer(userId: string): Promise<Stripe.Customer> {
    try {
      const found = await this.stripe.customers.search({
        query: `metadata['userId']:'${userId}'`,
        limit: 1,
      });
      if (found.data[0]) {
        return found.data[0];
      }
    } catch {
      // customers.search may be unavailable on some accounts — fall through to create.
    }
    return this.stripe.customers.create({ metadata: { userId } });
  }

  /**
   * Create a Stripe-hosted Checkout Session for the premium subscription and
   * return its URL. The mobile app opens this URL in a browser (no native SDK
   * needed, so it works in Expo Go). Premium is activated by the
   * checkout.session.completed webhook.
   */
  async createCheckoutSession(userId: string): Promise<{ url: string }> {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }
    const priceId = this.getPriceId(SubscriptionTier.PREMIUM);
    if (!priceId) {
      throw new Error(
        'STRIPE_PREMIUM_PRICE_ID is not configured. Set it to your Stripe Price ID.',
      );
    }

    const customer = await this.getOrCreateCustomer(userId);
    const baseUrl =
      this.configService.get<string>('BASE_URL') || 'http://localhost:3000';

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customer.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/payments/stripe/return?status=success`,
      cancel_url: `${baseUrl}/payments/stripe/return?status=cancel`,
      metadata: { userId },
      subscription_data: { metadata: { userId } },
    });

    if (!session.url) {
      throw new Error('Stripe did not return a Checkout URL');
    }
    return { url: session.url };
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
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
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

  /** Activate premium when a hosted Checkout subscription completes. */
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    if (!userId) {
      this.logger.warn('checkout.session.completed without userId metadata');
      return;
    }
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;

    await this.subscriptionsService.create(userId, SubscriptionTier.PREMIUM, {
      stripeSubscriptionId: subscriptionId,
      paymentMethod: PaymentMethod.STRIPE,
    });
    this.logger.log(`Premium activated via Checkout for user ${userId}`);
  }

  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    const payment = await this.paymentsRepository.findOne({
      where: { stripePaymentId: paymentIntent.id },
    });

    if (payment) {
      payment.status = PaymentStatus.COMPLETED;
      await this.paymentsRepository.save(payment);

      // Activate the premium subscription now that payment has cleared. This is
      // the step that was previously missing — without it no user could become
      // premium (and the premium-gated Groups feature was unreachable).
      if (payment.subscriptionId) {
        await this.subscriptionsService.create(payment.userId, SubscriptionTier.PREMIUM, {
          stripeSubscriptionId: payment.subscriptionId,
          paymentMethod: PaymentMethod.STRIPE,
        });
        this.logger.log(`Premium activated for user ${payment.userId}`);
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
    // Map Stripe status → our local status and sync period/cancel flags so
    // renewals and cancellations from Stripe are reflected in the DB.
    const statusMap: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      trialing: SubscriptionStatus.TRIALING,
      past_due: SubscriptionStatus.PAST_DUE,
      canceled: SubscriptionStatus.CANCELED,
      unpaid: SubscriptionStatus.PAST_DUE,
      incomplete: SubscriptionStatus.PAST_DUE,
      incomplete_expired: SubscriptionStatus.CANCELED,
    };
    const status = statusMap[subscription.status] ?? SubscriptionStatus.CANCELED;

    // current_period_end lives on the subscription (older API) or its items (newer).
    const periodEndUnix =
      (subscription as any).current_period_end ??
      subscription.items?.data?.[0]?.current_period_end;
    const currentPeriodEnd = periodEndUnix ? new Date(periodEndUnix * 1000) : undefined;

    await this.subscriptionsService.syncFromStripe(subscription.id, {
      status,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
    this.logger.log(`Subscription updated: ${subscription.id} -> ${status}`);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    await this.subscriptionsService.deactivateByStripeSubscriptionId(subscription.id);
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

