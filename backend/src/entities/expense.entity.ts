import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Category } from './category.entity';

export enum ExpenseSource {
  APP = 'app',
  VOICE_APP = 'voice_app',
  WHATSAPP = 'whatsapp',
  TELEGRAM = 'telegram',
  RECEIPT_SCAN = 'receipt_scan',
}

export enum TransactionType {
  EXPENSE = 'expense',
  INCOME = 'income',
}

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column('decimal', { precision: 18, scale: 2 })
  amount: number;

  @Column()
  currency: string;

  @Column('decimal', { precision: 18, scale: 2, nullable: true })
  convertedAmount: number; // Amount in user's default currency

  @Column({ nullable: true })
  convertedCurrency: string;

  @Column()
  description: string;

  @Column({ nullable: true })
  categoryId: string;

  @Column({ nullable: true })
  merchant: string;

  @Column('date')
  date: Date;

  @Column('json', { nullable: true })
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };

  @Column({ nullable: true })
  receiptImageUrl: string;

  @Column({
    type: 'varchar',
    default: ExpenseSource.APP,
  })
  source: ExpenseSource;

  @Column({
    type: 'varchar',
    default: TransactionType.EXPENSE,
  })
  type: TransactionType; // 'expense' or 'income'

  @Column('simple-array', { nullable: true })
  tags: string[]; // Array of tag names

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.expenses)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category: Category;
}

