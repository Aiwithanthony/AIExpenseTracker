import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ExpenseGroup } from './expense-group.entity';
import { Expense } from './expense.entity';

@Entity('group_expenses')
export class GroupExpense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  groupId: string;

  @Column()
  expenseId: string;

  @Column()
  userId: string; // Who paid

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column()
  currency: string;

  @Column()
  description: string;

  @Column('date')
  date: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ExpenseGroup, (group) => group.expenses)
  @JoinColumn({ name: 'groupId' })
  group: ExpenseGroup;

  @ManyToOne(() => Expense)
  @JoinColumn({ name: 'expenseId' })
  expense: Expense;
}

