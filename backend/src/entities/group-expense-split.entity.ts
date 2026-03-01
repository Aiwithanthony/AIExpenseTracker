import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { GroupExpense } from './group-expense.entity';
import { User } from './user.entity';

@Entity('group_expense_splits')
@Unique(['groupExpenseId', 'userId'])
export class GroupExpenseSplit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  groupExpenseId: string;

  @Column()
  userId: string;

  @Column('decimal', { precision: 18, scale: 2 })
  amount: number;

  @ManyToOne(() => GroupExpense, (expense) => expense.splits, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupExpenseId' })
  groupExpense: GroupExpense;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
