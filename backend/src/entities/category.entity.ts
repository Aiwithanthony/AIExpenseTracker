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
import { Expense } from './expense.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId: string; // null for default categories

  @Column()
  name: string;

  @Column({ nullable: true })
  icon: string;

  @Column({ nullable: true })
  color: string;

  @Column({ default: false })
  isDefault: boolean;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  budgetLimit: number; // Monthly budget limit for this category

  @Column({ nullable: true })
  budgetPeriod: string; // 'monthly', 'weekly', 'yearly'

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.categories, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => Expense, (expense) => expense.category)
  expenses: Expense[];
}

