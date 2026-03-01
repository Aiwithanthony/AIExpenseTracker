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

@Entity('group_invites')
export class GroupInvite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  groupId: string;

  @Column()
  email: string;

  @Column({ unique: true })
  token: string;

  @Column()
  invitedBy: string;

  @Column()
  expiresAt: Date;

  @Column({ nullable: true })
  acceptedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => ExpenseGroup, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: ExpenseGroup;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'invitedBy' })
  inviter: User;
}
