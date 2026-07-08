import { User } from '../entities/user.entity';
import { Expense } from '../entities/expense.entity';
import { Category } from '../entities/category.entity';
import { Subscription } from '../entities/subscription.entity';
import { ExpenseGroup } from '../entities/expense-group.entity';
import { GroupExpense } from '../entities/group-expense.entity';
import { GroupMember } from '../entities/group-member.entity';
import { GroupExpenseSplit } from '../entities/group-expense-split.entity';
import { GroupInvite } from '../entities/group-invite.entity';
import { GroupSettlement } from '../entities/group-settlement.entity';
import { GroupExpenseComment } from '../entities/group-expense-comment.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { Payment } from '../entities/payment.entity';
import { Budget } from '../entities/budget.entity';
import { Bill } from '../entities/bill.entity';
import { Template } from '../entities/template.entity';
import { Wallet } from '../entities/wallet.entity';
import { Challenge } from '../entities/challenge.entity';
import { LocationRule } from '../entities/location-rule.entity';

/** Single source of truth for the entity list — shared by the Nest module and the migration CLI. */
export const ALL_ENTITIES = [
  User,
  Expense,
  Category,
  Subscription,
  ExpenseGroup,
  GroupExpense,
  GroupMember,
  GroupExpenseSplit,
  GroupInvite,
  GroupSettlement,
  GroupExpenseComment,
  RefreshToken,
  Payment,
  Budget,
  Bill,
  Template,
  Wallet,
  Challenge,
  LocationRule,
];
