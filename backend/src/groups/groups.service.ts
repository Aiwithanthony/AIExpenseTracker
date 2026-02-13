import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsString, IsArray, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ExpenseGroup } from '../entities/expense-group.entity';
import { GroupExpense } from '../entities/group-expense.entity';
import { Expense } from '../entities/expense.entity';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

export class CreateGroupDto {
  @IsString()
  name: string;

  @IsArray()
  @IsString({ each: true })
  memberIds: string[];
}

export class AddExpenseToGroupDto {
  @IsString()
  expenseId: string;

  @Type(() => Number)
  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsString()
  description: string;

  @IsDateString()
  date: Date;
}

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(ExpenseGroup)
    private groupsRepository: Repository<ExpenseGroup>,
    @InjectRepository(GroupExpense)
    private groupExpensesRepository: Repository<GroupExpense>,
    @InjectRepository(Expense)
    private expensesRepository: Repository<Expense>,
    private subscriptionsService: SubscriptionsService,
  ) {}

  async create(userId: string, createDto: CreateGroupDto): Promise<ExpenseGroup> {
    // Check premium access
    const hasPremium = await this.subscriptionsService.hasPremiumAccess(userId);
    if (!hasPremium) {
      throw new ForbiddenException('Premium subscription required for group expenses');
    }

    const group = this.groupsRepository.create({
      ...createDto,
      createdBy: userId,
      memberIds: [userId, ...createDto.memberIds], // Include creator
    });

    return this.groupsRepository.save(group);
  }

  async findAll(userId: string): Promise<ExpenseGroup[]> {
    return this.groupsRepository.find({
      where: [
        { createdBy: userId },
        { memberIds: { $contains: [userId] } as any },
      ],
      relations: ['expenses', 'creator'],
    });
  }

  async findOne(userId: string, id: string): Promise<ExpenseGroup> {
    const group = await this.groupsRepository.findOne({
      where: { id },
      relations: ['expenses', 'creator'],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Check if user is member
    if (!group.memberIds.includes(userId)) {
      throw new ForbiddenException('Not a member of this group');
    }

    return group;
  }

  async addExpense(
    userId: string,
    groupId: string,
    dto: AddExpenseToGroupDto,
  ): Promise<GroupExpense> {
    const group = await this.findOne(userId, groupId);

    // Create base expense
    const expense = this.expensesRepository.create({
      userId,
      amount: dto.amount,
      currency: dto.currency,
      description: dto.description,
      date: dto.date,
    });
    const savedExpense = await this.expensesRepository.save(expense);

    // Create group expense
    const groupExpense = this.groupExpensesRepository.create({
      groupId,
      expenseId: savedExpense.id,
      userId,
      amount: dto.amount,
      currency: dto.currency,
      description: dto.description,
      date: dto.date,
    });

    return this.groupExpensesRepository.save(groupExpense);
  }

  async getGroupExpenses(userId: string, groupId: string) {
    const group = await this.findOne(userId, groupId);
    
    return this.groupExpensesRepository.find({
      where: { groupId },
      relations: ['expense', 'group'],
      order: { date: 'DESC' },
    });
  }

  async deleteGroup(userId: string, id: string): Promise<void> {
    const group = await this.findOne(userId, id);
    
    if (group.createdBy !== userId) {
      throw new ForbiddenException('Only group creator can delete the group');
    }

    await this.groupsRepository.remove(group);
  }
}

