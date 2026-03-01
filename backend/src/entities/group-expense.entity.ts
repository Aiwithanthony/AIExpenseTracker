import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ExpenseGroup } from './expense-group.entity';
import { User } from './user.entity';
import { GroupExpenseSplit } from './group-expense-split.entity';

export enum SplitType {
  EQUAL = 'equal',
  EXACT = 'exact',
  PERCENTAGE = 'percentage',
}

@Entity('group_expenses')
export class GroupExpense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  groupId: string;

  @Column()
  paidBy: string;

  @Column('decimal', { precision: 18, scale: 2 })
  amount: number;

  @Column()
  currency: string;

  @Column()
  description: string;

  @Column('date')
  date: Date;

  @Column({ type: 'varchar', default: SplitType.EQUAL })
  splitType: SplitType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ExpenseGroup, (group) => group.expenses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: ExpenseGroup;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'paidBy' })
  payer: User;

  @OneToMany(() => GroupExpenseSplit, (split) => split.groupExpense, { cascade: true })
  splits: GroupExpenseSplit[];
}
