import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GroupExpense } from './group-expense.entity';
import { User } from './user.entity';

@Entity('group_expense_comments')
export class GroupExpenseComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  groupExpenseId: string;

  @Column()
  userId: string;

  @Column('text')
  text: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => GroupExpense, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupExpenseId' })
  groupExpense: GroupExpense;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
