import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { IsString, IsNumber, IsOptional, IsDateString, IsBoolean } from 'class-validator';
import { Bill } from '../entities/bill.entity';
import { Expense, TransactionType } from '../entities/expense.entity';
import { ExpensesService } from '../expenses/expenses.service';

export class CreateBillDto {
  @IsString()
  name: string;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsDateString()
  dueDate: string;

  @IsString()
  frequency: string; // 'monthly', 'weekly', 'yearly', 'one-time'

  @IsOptional()
  @IsNumber()
  reminderDaysBefore?: number;
}

export class UpdateBillDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  frequency?: string;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  reminderDaysBefore?: number;
}

@Injectable()
export class BillsService {
  constructor(
    @InjectRepository(Bill)
    private billsRepository: Repository<Bill>,
    private expensesService: ExpensesService,
  ) {}

  async create(userId: string, createDto: CreateBillDto): Promise<Bill> {
    const bill = this.billsRepository.create({
      ...createDto,
      userId,
      dueDate: new Date(createDto.dueDate),
    });

    return this.billsRepository.save(bill);
  }

  async findAll(userId: string): Promise<Bill[]> {
    return this.billsRepository.find({
      where: { userId },
      relations: ['category'],
      order: { dueDate: 'ASC' },
    });
  }

  async findOne(userId: string, id: string): Promise<Bill> {
    const bill = await this.billsRepository.findOne({
      where: { id, userId },
      relations: ['category'],
    });

    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    return bill;
  }

  async update(userId: string, id: string, updateDto: UpdateBillDto): Promise<Bill> {
    const bill = await this.findOne(userId, id);

    Object.assign(bill, {
      ...updateDto,
      ...(updateDto.dueDate && { dueDate: new Date(updateDto.dueDate) }),
    });

    return this.billsRepository.save(bill);
  }

  async remove(userId: string, id: string): Promise<void> {
    const bill = await this.findOne(userId, id);
    await this.billsRepository.remove(bill);
  }

  async markAsPaid(userId: string, id: string, paidDate?: Date): Promise<Bill> {
    const bill = await this.findOne(userId, id);
    
    bill.isPaid = true;
    bill.lastPaidDate = paidDate || new Date();

    // Create expense from bill
    await this.expensesService.create(userId, {
      amount: bill.amount,
      currency: bill.currency,
      description: bill.name,
      categoryId: bill.categoryId,
      date: bill.lastPaidDate,
      type: TransactionType.EXPENSE,
    });

    // Update next due date if recurring
    if (bill.frequency !== 'one-time') {
      const nextDueDate = new Date(bill.dueDate);
      switch (bill.frequency) {
        case 'monthly':
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
          break;
        case 'weekly':
          nextDueDate.setDate(nextDueDate.getDate() + 7);
          break;
        case 'yearly':
          nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
          break;
      }
      bill.dueDate = nextDueDate;
      bill.isPaid = false; // Reset for next period
    }

    return this.billsRepository.save(bill);
  }

  async getUpcomingBills(userId: string, days: number = 7): Promise<Bill[]> {
    const date = new Date();
    date.setDate(date.getDate() + days);

    return this.billsRepository.find({
      where: {
        userId,
        isActive: true,
        isPaid: false,
        dueDate: LessThanOrEqual(date),
      },
      relations: ['category'],
      order: { dueDate: 'ASC' },
    });
  }
}

