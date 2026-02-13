import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsString, IsNumber, IsOptional, IsEnum, IsArray } from 'class-validator';
import { Template, TemplateType } from '../entities/template.entity';
import { TransactionType } from '../entities/expense.entity';
import { ExpensesService } from '../expenses/expenses.service';

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  merchant?: string;

  @IsOptional()
  @IsEnum(TemplateType)
  type?: TemplateType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateTemplateDto {
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
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  merchant?: string;

  @IsOptional()
  @IsEnum(TemplateType)
  type?: TemplateType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(Template)
    private templatesRepository: Repository<Template>,
    private expensesService: ExpensesService,
  ) {}

  async create(userId: string, createDto: CreateTemplateDto): Promise<Template> {
    const template = this.templatesRepository.create({
      ...createDto,
      userId,
      type: createDto.type || TemplateType.EXPENSE,
    });

    return this.templatesRepository.save(template);
  }

  async findAll(userId: string): Promise<Template[]> {
    return this.templatesRepository.find({
      where: { userId },
      relations: ['category'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(userId: string, id: string): Promise<Template> {
    const template = await this.templatesRepository.findOne({
      where: { id, userId },
      relations: ['category'],
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async update(userId: string, id: string, updateDto: UpdateTemplateDto): Promise<Template> {
    const template = await this.findOne(userId, id);
    Object.assign(template, updateDto);
    return this.templatesRepository.save(template);
  }

  async remove(userId: string, id: string): Promise<void> {
    const template = await this.findOne(userId, id);
    await this.templatesRepository.remove(template);
  }

  async createExpenseFromTemplate(userId: string, templateId: string, date?: Date): Promise<any> {
    const template = await this.findOne(userId, templateId);
    
    return this.expensesService.create(userId, {
      amount: template.amount,
      currency: template.currency,
      description: template.description || template.name,
      categoryId: template.categoryId,
      merchant: template.merchant,
      date: date || new Date(),
      type: template.type === TemplateType.INCOME ? TransactionType.INCOME : TransactionType.EXPENSE,
      tags: template.tags,
    });
  }
}

