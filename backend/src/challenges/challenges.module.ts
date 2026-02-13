import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChallengesController } from './challenges.controller';
import { ChallengesService } from './challenges.service';
import { Challenge } from '../entities/challenge.entity';
import { Expense, TransactionType } from '../entities/expense.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Challenge, Expense])],
  controllers: [ChallengesController],
  providers: [ChallengesService],
  exports: [ChallengesService],
})
export class ChallengesModule {}

