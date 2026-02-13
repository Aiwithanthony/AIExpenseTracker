import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsString, IsOptional } from 'class-validator';
import { Category } from '../entities/category.entity';

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;
}

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
  ) {}

  async create(userId: string, createDto: CreateCategoryDto): Promise<Category> {
    const category = this.categoriesRepository.create({
      ...createDto,
      userId,
      isDefault: false,
    });
    return this.categoriesRepository.save(category);
  }

  async findAll(userId: string): Promise<Category[]> {
    return this.categoriesRepository.find({
      where: [
        { userId },
        { isDefault: true },
      ],
      order: { isDefault: 'DESC', name: 'ASC' },
    });
  }

  async findOne(userId: string, id: string): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: { id, userId },
    });

    if (!category) {
      // Check if it's a default category
      const defaultCategory = await this.categoriesRepository.findOne({
        where: { id, isDefault: true },
      });
      if (!defaultCategory) {
        throw new NotFoundException('Category not found');
      }
      return defaultCategory;
    }

    return category;
  }

  async update(
    userId: string,
    id: string,
    updateDto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.findOne(userId, id);
    Object.assign(category, updateDto);
    return this.categoriesRepository.save(category);
  }

  async remove(userId: string, id: string): Promise<void> {
    const category = await this.findOne(userId, id);
    if (category.isDefault) {
      throw new Error('Cannot delete default category');
    }
    await this.categoriesRepository.remove(category);
  }

  async seedDefaultCategories(): Promise<void> {
    const defaultCategories = [
      { name: 'Food & Beverages', icon: '🍔', color: '#FF6B6B' },
      { name: 'Transportation', icon: '🚗', color: '#4ECDC4' },
      { name: 'Shopping', icon: '🛍️', color: '#95E1D3' },
      { name: 'Bills & Utilities', icon: '💡', color: '#F38181' },
      { name: 'Entertainment', icon: '🎬', color: '#AA96DA' },
      { name: 'Healthcare', icon: '🏥', color: '#FCBAD3' },
      { name: 'Education', icon: '📚', color: '#A8E6CF' },
      { name: 'Travel', icon: '✈️', color: '#FFD93D' },
      { name: 'Groceries', icon: '🛒', color: '#6BCB77' },
      { name: 'Clothing', icon: '👕', color: '#4D96FF' },
      { name: 'Other', icon: '📦', color: '#95A5A6' },
    ];

    for (const cat of defaultCategories) {
      const exists = await this.categoriesRepository.findOne({
        where: { name: cat.name, isDefault: true },
      });
      if (!exists) {
        await this.categoriesRepository.save({
          ...cat,
          isDefault: true,
        });
      }
    }
  }
}

