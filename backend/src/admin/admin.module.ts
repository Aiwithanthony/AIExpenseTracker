import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { User } from '../entities/user.entity';
import { Expense } from '../entities/expense.entity';
import { Subscription } from '../entities/subscription.entity';
import { Payment } from '../entities/payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Expense, Subscription, Payment]),
  ],
  controllers: [AdminController],
})
export class AdminModule {}

