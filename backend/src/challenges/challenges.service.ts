import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { IsString, IsNumber, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { Challenge, ChallengeType, ChallengeStatus } from '../entities/challenge.entity';
import { Expense, TransactionType } from '../entities/expense.entity';

export class CreateChallengeDto {
  @IsString()
  name: string;

  @IsEnum(ChallengeType)
  type: ChallengeType;

  @IsOptional()
  @IsNumber()
  targetAmount?: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  categoryId?: string;
}

export class UpdateChallengeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  targetAmount?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

@Injectable()
export class ChallengesService {
  constructor(
    @InjectRepository(Challenge)
    private challengesRepository: Repository<Challenge>,
    @InjectRepository(Expense)
    private expensesRepository: Repository<Expense>,
  ) {}

  async create(userId: string, createDto: CreateChallengeDto): Promise<Challenge> {
    const challenge = this.challengesRepository.create({
      ...createDto,
      userId,
      startDate: new Date(createDto.startDate),
      endDate: new Date(createDto.endDate),
      status: ChallengeStatus.ACTIVE,
    });

    return this.challengesRepository.save(challenge);
  }

  async findAll(userId: string): Promise<Challenge[]> {
    return this.challengesRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(userId: string, id: string): Promise<Challenge> {
    const challenge = await this.challengesRepository.findOne({
      where: { id, userId },
    });

    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    return challenge;
  }

  async update(userId: string, id: string, updateDto: UpdateChallengeDto): Promise<Challenge> {
    const challenge = await this.findOne(userId, id);

    Object.assign(challenge, {
      ...updateDto,
      ...(updateDto.startDate && { startDate: new Date(updateDto.startDate) }),
      ...(updateDto.endDate && { endDate: new Date(updateDto.endDate) }),
    });

    return this.challengesRepository.save(challenge);
  }

  async remove(userId: string, id: string): Promise<void> {
    const challenge = await this.findOne(userId, id);
    await this.challengesRepository.remove(challenge);
  }

  async updateProgress(userId: string, challengeId: string): Promise<Challenge> {
    const challenge = await this.findOne(userId, challengeId);

    // Calculate current progress based on challenge type
    const expenses = await this.expensesRepository.find({
      where: {
        userId,
        date: Between(challenge.startDate, challenge.endDate),
        type: TransactionType.EXPENSE,
        ...(challenge.categoryId && { categoryId: challenge.categoryId }),
      },
    });

    let progress = 0;

    switch (challenge.type) {
      case ChallengeType.SPENDING_LIMIT:
      case ChallengeType.CATEGORY_LIMIT:
        // Progress is total spent
        progress = expenses.reduce((sum, exp) => {
          return sum + (exp.convertedAmount || exp.amount);
        }, 0);
        break;

      case ChallengeType.SAVINGS_GOAL:
        // Progress is amount saved (income - expenses)
        const income = await this.expensesRepository.find({
          where: {
            userId,
            date: Between(challenge.startDate, challenge.endDate),
            type: TransactionType.INCOME,
          },
        });
        const totalIncome = income.reduce((sum, exp) => {
          return sum + (exp.convertedAmount || exp.amount);
        }, 0);
        const totalExpenses = expenses.reduce((sum, exp) => {
          return sum + (exp.convertedAmount || exp.amount);
        }, 0);
        progress = totalIncome - totalExpenses;
        break;

      case ChallengeType.NO_SPEND_DAY:
        // Progress is number of days without spending
        const days = Math.floor((new Date().getTime() - challenge.startDate.getTime()) / (1000 * 60 * 60 * 24));
        progress = days - expenses.length;
        break;
    }

    challenge.currentProgress = progress;

    // Check if challenge is completed or failed
    if (challenge.targetAmount) {
      if (challenge.type === ChallengeType.SAVINGS_GOAL || challenge.type === ChallengeType.NO_SPEND_DAY) {
        if (progress >= challenge.targetAmount) {
          challenge.status = ChallengeStatus.COMPLETED;
        }
      } else {
        if (progress >= challenge.targetAmount) {
          challenge.status = ChallengeStatus.FAILED;
        }
      }
    }

    return this.challengesRepository.save(challenge);
  }
}

