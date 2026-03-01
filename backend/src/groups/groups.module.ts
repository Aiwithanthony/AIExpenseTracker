import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { SplitCalculationService } from './split-calculation.service';
import { ExpenseGroup } from '../entities/expense-group.entity';
import { GroupExpense } from '../entities/group-expense.entity';
import { GroupMember } from '../entities/group-member.entity';
import { GroupExpenseSplit } from '../entities/group-expense-split.entity';
import { GroupSettlement } from '../entities/group-settlement.entity';
import { GroupInvite } from '../entities/group-invite.entity';
import { User } from '../entities/user.entity';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { CurrencyModule } from '../currency/currency.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExpenseGroup,
      GroupExpense,
      GroupMember,
      GroupExpenseSplit,
      GroupSettlement,
      GroupInvite,
      User,
    ]),
    SubscriptionsModule,
    CurrencyModule,
  ],
  controllers: [GroupsController],
  providers: [GroupsService, SplitCalculationService],
  exports: [GroupsService],
})
export class GroupsModule {}
