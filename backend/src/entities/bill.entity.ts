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

@Entity('bills')
export class Bill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  name: string; // e.g., "Electricity Bill", "Netflix Subscription"

  @Column('decimal', { precision: 18, scale: 2 })
  amount: number;

  @Column()
  currency: string;

  @Column({ nullable: true })
  categoryId: string;

  @Column()
  dueDate: Date; // Next due date

  @Column()
  frequency: string; // 'monthly', 'weekly', 'yearly', 'one-time'

  @Column({ default: false })
  isPaid: boolean;

  @Column({ nullable: true })
  lastPaidDate: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  reminderDaysBefore: number; // e.g., 3 days before due date

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category: Category;
}

