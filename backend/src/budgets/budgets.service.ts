import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { IsNumber, IsString, IsOptional, IsDateString, IsBoolean } from 'class-validator';
import { Budget } from '../entities/budget.entity';
import { Expense, TransactionType } from '../entities/expense.entity';
import { Category } from '../entities/category.entity';

export class CreateBudgetDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsString()
  period: string; // 'monthly', 'weekly', 'yearly'

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}

export class UpdateBudgetDto {
  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  period?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@Injectable()
export class BudgetsService {
  constructor(
    @InjectRepository(Budget)
    private budgetsRepository: Repository<Budget>,
    @InjectRepository(Expense)
    private expensesRepository: Repository<Expense>,
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
  ) {}

  async create(userId: string, createDto: CreateBudgetDto): Promise<Budget> {
    const budget = this.budgetsRepository.create({
      ...createDto,
      userId,
      startDate: new Date(createDto.startDate),
      endDate: new Date(createDto.endDate),
    });

    return this.budgetsRepository.save(budget);
  }

  async findAll(userId: string): Promise<Budget[]> {
    return this.budgetsRepository.find({
      where: { userId },
      relations: ['category'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(userId: string, id: string): Promise<Budget> {
    const budget = await this.budgetsRepository.findOne({
      where: { id, userId },
      relations: ['category'],
    });

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    return budget;
  }

  async update(userId: string, id: string, updateDto: UpdateBudgetDto): Promise<Budget> {
    const budget = await this.findOne(userId, id);

    Object.assign(budget, {
      ...updateDto,
      ...(updateDto.startDate && { startDate: new Date(updateDto.startDate) }),
      ...(updateDto.endDate && { endDate: new Date(updateDto.endDate) }),
    });

    return this.budgetsRepository.save(budget);
  }

  async remove(userId: string, id: string): Promise<void> {
    const budget = await this.findOne(userId, id);
    await this.budgetsRepository.remove(budget);
  }

  async getBudgetStatus(userId: string, budgetId: string): Promise<{
    budget: Budget;
    spent: number;
    remaining: number;
    percentageUsed: number;
    expenses: Expense[];
  }> {
    const budget = await this.findOne(userId, budgetId);

    // Get expenses for this budget period
    const expenses = await this.expensesRepository.find({
      where: {
        userId,
        date: Between(budget.startDate, budget.endDate),
        type: TransactionType.EXPENSE,
        ...(budget.categoryId && { categoryId: budget.categoryId }),
      },
    });

    // Calculate total spent
    const spent = expenses.reduce((sum, exp) => {
      const amount = exp.convertedAmount || exp.amount;
      return sum + amount;
    }, 0);

    const remaining = budget.amount - spent;
    const percentageUsed = (spent / budget.amount) * 100;

    return {
      budget,
      spent,
      remaining,
      percentageUsed,
      expenses,
    };
  }

  async checkBudgetAlerts(userId: string): Promise<Budget[]> {
    const activeBudgets = await this.budgetsRepository.find({
      where: { userId, isActive: true },
      relations: ['category'],
    });

    const alerts: Budget[] = [];

    for (const budget of activeBudgets) {
      const status = await this.getBudgetStatus(userId, budget.id);
      
      // Alert if over 80% used
      if (status.percentageUsed >= 80) {
        alerts.push(budget);
      }
    }

    return alerts;
  }
}

