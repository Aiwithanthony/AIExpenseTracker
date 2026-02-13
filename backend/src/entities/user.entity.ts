import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Expense } from './expense.entity';
import { Category } from './category.entity';
import { Subscription } from './subscription.entity';
import { ExpenseGroup } from './expense-group.entity';

export enum SubscriptionTier {
  FREE = 'free',
  PREMIUM = 'premium',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  passwordHash: string; // Nullable for OAuth users

  @Column({ 
    type: 'varchar',
    default: SubscriptionTier.FREE 
  })
  subscriptionTier: SubscriptionTier;

  @Column({ nullable: true })
  subscriptionExpiresAt: Date;

  @Column({ default: 'USD' })
  currency: string; // Default currency

  @Column({ nullable: true })
  whatsappNumber: string;

  @Column({ nullable: true })
  telegramChatId: string;

  @Column({ type: 'varchar', nullable: true })
  authProvider?: string; // 'email', 'google', 'apple'

  @Column({ type: 'varchar', nullable: true })
  externalId?: string; // Google/Apple user ID

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => Expense, (expense) => expense.user)
  expenses: Expense[];

  @OneToMany(() => Category, (category) => category.user)
  categories: Category[];

  @OneToOne(() => Subscription, (subscription) => subscription.user)
  subscription: Subscription;

  @OneToMany(() => ExpenseGroup, (group) => group.createdBy)
  createdGroups: ExpenseGroup[];
}

