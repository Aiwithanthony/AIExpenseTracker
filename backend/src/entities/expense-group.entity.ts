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
import { User } from './user.entity';
import { GroupExpense } from './group-expense.entity';
import { GroupMember } from './group-member.entity';
import { GroupSettlement } from './group-settlement.entity';

@Entity('expense_groups')
export class ExpenseGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: 'USD' })
  baseCurrency: string;

  @Column({ unique: true, length: 8 })
  inviteCode: string;

  @Column()
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @OneToMany(() => GroupMember, (member) => member.group)
  members: GroupMember[];

  @OneToMany(() => GroupExpense, (groupExpense) => groupExpense.group)
  expenses: GroupExpense[];

  @OneToMany(() => GroupSettlement, (settlement) => settlement.group)
  settlements: GroupSettlement[];
}
