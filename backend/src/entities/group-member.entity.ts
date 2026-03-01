import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ExpenseGroup } from './expense-group.entity';
import { User } from './user.entity';

@Entity('group_members')
@Unique(['groupId', 'userId'])
export class GroupMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  groupId: string;

  @Column()
  userId: string;

  @Column({ default: 'member' })
  role: string; // 'admin' | 'member'

  @CreateDateColumn()
  joinedAt: Date;

  @ManyToOne(() => ExpenseGroup, (group) => group.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: ExpenseGroup;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
