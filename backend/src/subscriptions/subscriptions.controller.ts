import { Controller, Get, Post, Delete, UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('status')
  async getStatus(@CurrentUser() user: User) {
    return this.subscriptionsService.checkSubscriptionStatus(user.id);
  }

  @Post('cancel')
  async cancel(@CurrentUser() user: User) {
    return this.subscriptionsService.cancel(user.id);
  }

  @Post('reactivate')
  async reactivate(@CurrentUser() user: User) {
    return this.subscriptionsService.reactivate(user.id);
  }
}

