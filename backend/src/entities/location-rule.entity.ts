import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { DecimalTransformer } from '../common/transformers/decimal.transformer';

export type LocationRuleType =
  | 'coffee_shop'
  | 'restaurant'
  | 'grocery'
  | 'mall'
  | 'supermarket'
  | 'custom';

@Entity('location_rules')
export class LocationRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @Column({ default: '' })
  name: string;

  @Column({ type: 'varchar', default: 'custom' })
  locationType: LocationRuleType;

  @Column('decimal', { precision: 10, scale: 6, transformer: DecimalTransformer })
  latitude: number;

  @Column('decimal', { precision: 10, scale: 6, transformer: DecimalTransformer })
  longitude: number;

  @Column('decimal', { precision: 10, scale: 2, transformer: DecimalTransformer })
  radius: number; // meters

  @Column('decimal', { precision: 10, scale: 2, transformer: DecimalTransformer })
  minTimeSpent: number; // minutes

  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
