import { Controller, Post, Body, Headers, UseGuards, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
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

