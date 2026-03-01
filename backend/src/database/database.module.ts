import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';
import { Expense } from '../entities/expense.entity';
import { Category } from '../entities/category.entity';
import { Subscription } from '../entities/subscription.entity';
import { ExpenseGroup } from '../entities/expense-group.entity';
import { GroupExpense } from '../entities/group-expense.entity';
import { GroupMember } from '../entities/group-member.entity';
import { GroupExpenseSplit } from '../entities/group-expense-split.entity';
import { GroupInvite } from '../entities/group-invite.entity';
import { GroupSettlement } from '../entities/group-settlement.entity';
import { Payment } from '../entities/payment.entity';
import { Budget } from '../entities/budget.entity';
import { Bill } from '../entities/bill.entity';
import { Template } from '../entities/template.entity';
import { Wallet } from '../entities/wallet.entity';
import { Challenge } from '../entities/challenge.entity';
import { join } from 'path';

const ALL_ENTITIES = [
  User,
  Expense,
  Category,
  Subscription,
  ExpenseGroup,
  GroupExpense,
  GroupMember,
  GroupExpenseSplit,
  GroupInvite,
  GroupSettlement,
  Payment,
  Budget,
  Bill,
  Template,
  Wallet,
  Challenge,
];

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbType = configService.get<string>('DB_TYPE', 'sqlite');

        // Use SQLite for local development (no setup required)
        if (dbType === 'sqlite') {
          return {
            type: 'better-sqlite3',
            database: join(process.cwd(), 'data', 'expense_tracker.db'),
            entities: ALL_ENTITIES,
            synchronize: true,
            logging: configService.get<string>('NODE_ENV') === 'development',
          };
        }

        // PostgreSQL for production
        const databaseUrl = configService.get<string>('DATABASE_URL');

        if (databaseUrl) {
          const url = new URL(databaseUrl);
          const sslMode = url.searchParams.get('sslmode');

          // Configure SSL for cloud PostgreSQL (Neon, etc.)
          const sslConfig = sslMode === 'require' || sslMode === 'prefer'
            ? { rejectUnauthorized: false } // Required for Neon and most cloud providers
            : false;

          return {
            type: 'postgres',
            host: url.hostname,
            port: parseInt(url.port) || 5432,
            username: url.username,
            password: url.password,
            database: url.pathname.slice(1),
            ssl: sslConfig,
            entities: ALL_ENTITIES,
            synchronize: configService.get<string>('NODE_ENV') === 'development',
            logging: configService.get<string>('NODE_ENV') === 'development',
          };
        }

        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get<string>('DB_USERNAME', 'postgres'),
          password: configService.get<string>('DB_PASSWORD', 'postgres'),
          database: configService.get<string>('DB_NAME', 'expense_tracker'),
          entities: ALL_ENTITIES,
          synchronize: configService.get<string>('NODE_ENV') === 'development',
          logging: configService.get<string>('NODE_ENV') === 'development',
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
