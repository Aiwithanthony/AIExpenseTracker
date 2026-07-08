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
import { encryptField, decryptField } from '../common/utils/encryption';

export enum SubscriptionTier {
  FREE = 'free',
  PREMIUM = 'premium',
}

/** TypeORM column transformer — encrypts phoneNumber at rest when ENCRYPTION_KEY is set */
const phoneTransformer = {
  to: (value: string | null | undefined): string | null =>
    value != null ? encryptField(value) : null,
  from: (value: string | null | undefined): string | null =>
    value != null ? decryptField(value) : null,
};

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ nullable: true, transformer: phoneTransformer })
  phoneNumber: string;

  @Column({ nullable: true })
  passwordHash: string; // Nullable for OAuth users

  @Column({
    type: 'varchar',
    default: SubscriptionTier.FREE,
  })
  subscriptionTier: SubscriptionTier;

  // Gates access to the /admin/* endpoints and the admin dashboard.
  @Column({ default: false })
  isAdmin: boolean;

  @Column({ nullable: true })
  subscriptionExpiresAt: Date;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ nullable: true })
  whatsappNumber: string;

  @Column({ nullable: true })
  telegramChatId: string;

  // Short-lived, single-use code the user generates in-app and sends to the
  // Telegram bot to bind their chat. Prevents account takeover via /link <email>.
  @Column({ type: 'varchar', nullable: true })
  telegramLinkCode: string | null;

  @Column({ type: 'timestamp', nullable: true })
  telegramLinkCodeExpires: Date | null;

  @Column({ type: 'varchar', nullable: true })
  authProvider?: string; // 'email', 'google', 'apple'

  @Column({ type: 'varchar', nullable: true })
  externalId?: string; // Google/Apple user ID

  // --- Account lockout ---
  @Column({ default: 0 })
  failedLoginAttempts: number;

  @Column({ type: 'timestamp', nullable: true })
  lockoutUntil: Date | null;

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

  @OneToMany(() => ExpenseGroup, (group) => group.creator)
  createdGroups: ExpenseGroup[];
}
