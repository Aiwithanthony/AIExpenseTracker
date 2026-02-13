import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { IsString, IsNumber, IsOptional, IsDateString, IsObject, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { Expense, ExpenseSource, TransactionType } from '../entities/expense.entity';
import { User } from '../entities/user.entity';
import { Category } from '../entities/category.entity';
import { Inject } from '@nestjs/common';
import type { LLMService } from '../llm/llm.interface';
import { CurrencyService } from '../currency/currency.service';

class LocationDto {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsOptional()
  @IsString()
  address?: string;
}

export class CreateExpenseDto {
  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  merchant?: string;

  @IsOptional()
  @IsDateString()
  date?: Date;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional()
  @IsString()
  receiptImageUrl?: string;

  @IsOptional()
  @IsEnum(ExpenseSource)
  source?: ExpenseSource;

  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateExpenseDto {
  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  merchant?: string;

  @IsOptional()
  @IsDateString()
  date?: Date;

  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsString({ each: true })
  tags?: string[];
}

export class ExpenseQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxAmount?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private expensesRepository: Repository<Expense>,
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
    @Inject('LLM_SERVICE')
    private llmService: LLMService,
    private currencyService: CurrencyService,
  ) {}

  async create(userId: string, createDto: CreateExpenseDto, userCurrency?: string): Promise<Expense> {
    const expense = this.expensesRepository.create({
      ...createDto,
      userId,
      date: createDto.date || new Date(),
      source: createDto.source || ExpenseSource.APP,
      type: createDto.type || TransactionType.EXPENSE,
    });

    // Convert to user's default currency if different
    if (userCurrency && createDto.currency !== userCurrency) {
      try {
        const convertedAmount = await this.currencyService.convert(
          createDto.amount,
          createDto.currency,
          userCurrency,
        );
        expense.convertedAmount = convertedAmount;
        expense.convertedCurrency = userCurrency;
      } catch (error) {
        console.error('Error converting currency:', error);
      }
    }

    // Auto-categorize if no category provided
    if (!createDto.categoryId) {
      const category = await this.autoCategorize(
        createDto.description,
        createDto.amount,
        createDto.merchant,
        userId,
      );
      if (category) {
        expense.categoryId = category.id;
      }
    }

    return this.expensesRepository.save(expense);
  }

  async findAll(userId: string, query: ExpenseQueryDto): Promise<{
    expenses: Expense[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.expensesRepository
      .createQueryBuilder('expense')
      .where('expense.userId = :userId', { userId })
      .leftJoinAndSelect('expense.category', 'category')
      .orderBy('expense.date', 'DESC')
      .addOrderBy('expense.createdAt', 'DESC');

    if (query.startDate && query.endDate) {
      queryBuilder.andWhere('expense.date BETWEEN :startDate AND :endDate', {
        startDate: query.startDate,
        endDate: query.endDate,
      });
    }

    if (query.categoryId) {
      queryBuilder.andWhere('expense.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    }

    if (query.minAmount !== undefined) {
      queryBuilder.andWhere('expense.amount >= :minAmount', {
        minAmount: query.minAmount,
      });
    }

    if (query.maxAmount !== undefined) {
      queryBuilder.andWhere('expense.amount <= :maxAmount', {
        maxAmount: query.maxAmount,
      });
    }

    if (query.search) {
      queryBuilder.andWhere(
        '(expense.description ILIKE :search OR expense.merchant ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [expenses, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      expenses,
      total,
      page,
      limit,
    };
  }

  async findOne(userId: string, id: string): Promise<Expense> {
    const expense = await this.expensesRepository.findOne({
      where: { id, userId },
      relations: ['category'],
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  async update(
    userId: string,
    id: string,
    updateDto: UpdateExpenseDto,
  ): Promise<Expense> {
    const expense = await this.findOne(userId, id);

    Object.assign(expense, updateDto);
    return this.expensesRepository.save(expense);
  }

  async remove(userId: string, id: string): Promise<void> {
    const expense = await this.findOne(userId, id);
    await this.expensesRepository.remove(expense);
  }

  async getStats(
    userId: string,
    startDate?: Date,
    endDate?: Date,
    userCurrency?: string,
  ): Promise<{
    total: number;
    totalIncome: number;
    totalExpenses: number;
    netAmount: number;
    byCategory: Record<string, number>;
    byDate: Record<string, number>;
    averagePerDay: number;
    topCategories: Array<{ name: string; amount: number; percentage: number }>;
    topMerchants: Array<{ name: string; amount: number; count: number }>;
  }> {
    const queryBuilder = this.expensesRepository
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.category', 'category')
      .where('expense.userId = :userId', { userId });

    if (startDate && endDate) {
      queryBuilder.andWhere('expense.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const expenses = await queryBuilder.getMany();

    const toNumber = (v: unknown): number => {
      if (typeof v === 'number') return v;
      if (typeof v === 'string') {
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : 0;
      }
      return 0;
    };

    const getAmountForStats = (e: Expense): number => {
      // Prefer convertedAmount when it's in the user's currency (or when currency isn't provided)
      // This keeps totals consistent with the user's default currency view.
      const convertedAmount = toNumber((e as any).convertedAmount);
      const convertedCurrency = (e as any).convertedCurrency as string | undefined;
      if (Number.isFinite(convertedAmount) && convertedAmount !== 0) {
        if (!userCurrency || (convertedCurrency && convertedCurrency === userCurrency)) {
          return convertedAmount;
        }
      }
      return toNumber(e.amount);
    };

    // Separate income and expenses
    const expenseTransactions = expenses.filter(e => !e.type || e.type === TransactionType.EXPENSE);
    const incomeTransactions = expenses.filter(e => e.type === TransactionType.INCOME);

    const totalExpenses = expenseTransactions.reduce((sum, e) => {
      const amount = getAmountForStats(e);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);

    const totalIncome = incomeTransactions.reduce((sum, e) => {
      const amount = getAmountForStats(e);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);

    const total = totalExpenses; // Keep for backward compatibility
    const netAmount = totalIncome - totalExpenses;

    const byCategory: Record<string, number> = {};
    expenseTransactions.forEach((expense) => {
      const categoryName = expense.category?.name || 'Uncategorized';
      const amount = getAmountForStats(expense);
      byCategory[categoryName] = (byCategory[categoryName] || 0) + (Number.isFinite(amount) ? amount : 0);
    });

    // Top categories
    const topCategories = Object.entries(byCategory)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Top merchants
    const merchantStats: Record<string, { amount: number; count: number }> = {};
    expenseTransactions.forEach((expense) => {
      if (expense.merchant) {
        const amount = getAmountForStats(expense);
        if (!merchantStats[expense.merchant]) {
          merchantStats[expense.merchant] = { amount: 0, count: 0 };
        }
        merchantStats[expense.merchant].amount += Number.isFinite(amount) ? amount : 0;
        merchantStats[expense.merchant].count += 1;
      }
    });

    const topMerchants = Object.entries(merchantStats)
      .map(([name, stats]) => ({
        name,
        amount: stats.amount,
        count: stats.count,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const byDate: Record<string, number> = {};
    expenseTransactions.forEach((expense) => {
      try {
        // Handle both Date objects and date strings (SQLite compatibility)
        const date = expense.date instanceof Date 
          ? expense.date 
          : new Date(expense.date);
        if (isNaN(date.getTime())) {
          return; // Skip invalid dates
        }
        const dateKey = date.toISOString().split('T')[0];
        const amount = getAmountForStats(expense);
        byDate[dateKey] = (byDate[dateKey] || 0) + (Number.isFinite(amount) ? amount : 0);
      } catch (error) {
        console.error('Error processing expense date:', error);
      }
    });

    const days = startDate && endDate
      ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) || 1
      : 30;
    const averagePerDay = days > 0 ? total / days : 0;

    return {
      total,
      totalIncome,
      totalExpenses,
      netAmount,
      byCategory,
      byDate,
      averagePerDay,
      topCategories,
      topMerchants,
    };
  }

  /**
   * Re-convert all expenses for a user to a new target currency.
   * Called when the user changes their preferred currency.
   */
  async reconvertAllForUser(userId: string, targetCurrency: string): Promise<{ converted: number; failed: number }> {
    const expenses = await this.expensesRepository.find({ where: { userId } });

    let converted = 0;
    let failed = 0;

    // Batch expenses by source currency to minimize API calls
    const byCurrency: Record<string, Expense[]> = {};
    for (const expense of expenses) {
      const src = expense.currency || targetCurrency;
      if (!byCurrency[src]) byCurrency[src] = [];
      byCurrency[src].push(expense);
    }

    for (const [sourceCurrency, batch] of Object.entries(byCurrency)) {
      if (sourceCurrency === targetCurrency) {
        // Same currency - convertedAmount = amount
        for (const expense of batch) {
          expense.convertedAmount = typeof expense.amount === 'string'
            ? parseFloat(expense.amount)
            : expense.amount;
          expense.convertedCurrency = targetCurrency;
        }
        await this.expensesRepository.save(batch);
        converted += batch.length;
        continue;
      }

      try {
        // Get rate once per source currency
        const rate = await this.currencyService.getExchangeRate(sourceCurrency, targetCurrency);
        for (const expense of batch) {
          const amount = typeof expense.amount === 'string'
            ? parseFloat(expense.amount)
            : expense.amount;
          expense.convertedAmount = parseFloat((amount * rate).toFixed(2));
          expense.convertedCurrency = targetCurrency;
        }
        await this.expensesRepository.save(batch);
        converted += batch.length;
      } catch (error) {
        console.error(`Failed to convert ${sourceCurrency} -> ${targetCurrency}:`, error);
        failed += batch.length;
      }
    }

    return { converted, failed };
  }

  private async autoCategorize(
    description: string,
    amount: number,
    merchant?: string,
    userId?: string,
  ): Promise<Category | null> {
    try {
      // Get user's custom categories
      const userCategories = userId
        ? await this.categoriesRepository.find({
            where: { userId },
          })
        : [];

      const categoryNames = userCategories.length
        ? userCategories.map((c) => c.name)
        : undefined;

      const categoryName = await this.llmService.categorizeExpense(
        description,
        amount,
        merchant,
        categoryNames,
      );

      // Find or create category
      let category = userId
        ? await this.categoriesRepository.findOne({
            where: { name: categoryName, userId },
          })
        : null;

      if (!category) {
        // Use default category if exists, otherwise create
        category = await this.categoriesRepository.findOne({
          where: { name: categoryName, isDefault: true },
        });

        if (!category && userId) {
          category = this.categoriesRepository.create({
            name: categoryName,
            userId,
            isDefault: false,
          });
          category = await this.categoriesRepository.save(category);
        }
      }

      return category;
    } catch (error) {
      console.error('Error auto-categorizing expense:', error);
      return null;
    }
  }
}

