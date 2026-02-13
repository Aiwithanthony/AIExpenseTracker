import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { ExpenseGroup } from '../entities/expense-group.entity';
import { GroupExpense } from '../entities/group-expense.entity';
import { Expense } from '../entities/expense.entity';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExpenseGroup, GroupExpense, Expense]),
    SubscriptionsModule,
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}

