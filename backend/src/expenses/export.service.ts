import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Expense, TransactionType } from '../entities/expense.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(Expense)
    private expensesRepository: Repository<Expense>,
  ) {}

  async exportToCSV(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<string> {
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

    // CSV Header
    const headers = [
      'Date',
      'Type',
      'Amount',
      'Currency',
      'Description',
      'Category',
      'Merchant',
      'Source',
      'Tags',
    ];

    // CSV Rows
    const rows = expenses.map((expense) => {
      return [
        expense.date.toISOString().split('T')[0],
        expense.type || TransactionType.EXPENSE,
        expense.amount.toString(),
        expense.currency,
        expense.description.replace(/,/g, ';'), // Replace commas to avoid CSV issues
        expense.category?.name || '',
        expense.merchant || '',
        expense.source,
        (expense.tags || []).join(';'),
      ];
    });

    // Combine header and rows
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  async exportToJSON(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any[]> {
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

    return expenses.map((expense) => ({
      id: expense.id,
      date: expense.date.toISOString(),
      type: expense.type || TransactionType.EXPENSE,
      amount: expense.amount,
      currency: expense.currency,
      convertedAmount: expense.convertedAmount,
      convertedCurrency: expense.convertedCurrency,
      description: expense.description,
      category: expense.category?.name || null,
      merchant: expense.merchant || null,
      source: expense.source,
      tags: expense.tags || [],
      location: expense.location || null,
      receiptImageUrl: expense.receiptImageUrl || null,
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
    }));
  }
}

