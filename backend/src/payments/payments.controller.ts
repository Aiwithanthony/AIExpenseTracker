import { Controller, Post, Get, Body, Headers, UseGuards, Req, Res, Query } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import { IsEnum, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, SubscriptionTier } from '../entities/user.entity';

export class CreateStripeSubscriptionDto {
  @IsEnum(SubscriptionTier)
  tier: SubscriptionTier;
}

export class CreateWhishPaymentDto {
  @Type(() => Number)
  @IsNumber()
  amount: number;

  @IsString()
  currency: string;
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('stripe/subscribe')
  @UseGuards(JwtAuthGuard)
  async createStripeSubscription(
    @CurrentUser() user: User,
    @Body() dto: CreateStripeSubscriptionDto,
  ) {
    return this.paymentsService.createStripeSubscription(user.id, dto.tier);
  }

  @Post('stripe/checkout')
  @UseGuards(JwtAuthGuard)
  async createCheckoutSession(@CurrentUser() user: User) {
    return this.paymentsService.createCheckoutSession(user.id);
  }

  /**
   * Landing page Stripe redirects to after hosted Checkout. Just shows a simple
   * message; premium is activated server-side by the webhook. The mobile app
   * closes the in-app browser and re-checks subscription status.
   */
  @Get('stripe/return')
  stripeReturn(@Query('status') status: string, @Res() res: Response) {
    const ok = status === 'success';
    res.set('Content-Type', 'text/html');
    return res.send(
      `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Expense Tracker</title></head>` +
        `<body style="font-family:-apple-system,system-ui,sans-serif;text-align:center;padding:48px 24px;color:#111">` +
        `<h2>${ok ? '✅ Payment complete' : 'Payment canceled'}</h2>` +
        `<p>${ok ? 'Your premium subscription is being activated. You can return to the app.' : 'No charge was made. You can return to the app.'}</p>` +
        `</body></html>`,
    );
  }

  @Post('stripe/webhook')
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.paymentsService.handleStripeWebhook(req.rawBody, signature);
  }

  @Post('whish')
  @UseGuards(JwtAuthGuard)
  async createWhishPayment(
    @CurrentUser() user: User,
    @Body() dto: CreateWhishPaymentDto,
  ) {
    return this.paymentsService.createWhishPayment(
      user.id,
      dto.amount,
      dto.currency,
    );
  }
}

