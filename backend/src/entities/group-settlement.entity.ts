import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ExpenseGroup } from './expense-group.entity';
import { User } from './user.entity';

@Entity('group_settlements')
export class GroupSettlement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  groupId: string;

  @Column()
  fromUserId: string;

  @Column()
  toUserId: string;

  @Column('decimal', { precision: 18, scale: 2 })
  amount: number;

  @Column()
  currency: string;

  @Column({ nullable: true })
  note: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => ExpenseGroup, (group) => group.settlements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: ExpenseGroup;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'fromUserId' })
  fromUser: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'toUserId' })
  toUser: User;
}
