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

export enum ChallengeType {
  SPENDING_LIMIT = 'spending_limit',
  SAVINGS_GOAL = 'savings_goal',
  NO_SPEND_DAY = 'no_spend_day',
  CATEGORY_LIMIT = 'category_limit',
}

export enum ChallengeStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('challenges')
export class Challenge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  name: string;

  @Column({
    type: 'varchar',
  })
  type: ChallengeType;

  @Column({
    type: 'varchar',
    default: ChallengeStatus.ACTIVE,
  })
  status: ChallengeStatus;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  targetAmount: number;

  @Column('date')
  startDate: Date;

  @Column('date')
  endDate: Date;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  currentProgress: number;

  @Column({ nullable: true })
  categoryId: string; // For category-specific challenges

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}

