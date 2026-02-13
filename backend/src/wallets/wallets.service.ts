import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { Wallet } from '../entities/wallet.entity';

export class CreateWalletDto {
  @IsString()
  name: string;

  @IsNumber()
  balance: number;

  @IsString()
  currency: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;
}

export class UpdateWalletDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  balance?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private walletsRepository: Repository<Wallet>,
  ) {}

  async create(userId: string, createDto: CreateWalletDto): Promise<Wallet> {
    const wallet = this.walletsRepository.create({
      ...createDto,
      userId,
    });

    return this.walletsRepository.save(wallet);
  }

  async findAll(userId: string): Promise<Wallet[]> {
    return this.walletsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(userId: string, id: string): Promise<Wallet> {
    const wallet = await this.walletsRepository.findOne({
      where: { id, userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }

  async update(userId: string, id: string, updateDto: UpdateWalletDto): Promise<Wallet> {
    const wallet = await this.findOne(userId, id);
    Object.assign(wallet, updateDto);
    return this.walletsRepository.save(wallet);
  }

  async remove(userId: string, id: string): Promise<void> {
    const wallet = await this.findOne(userId, id);
    await this.walletsRepository.remove(wallet);
  }

  async updateBalance(userId: string, id: string, amount: number): Promise<Wallet> {
    const wallet = await this.findOne(userId, id);
    
    const newBalance = wallet.balance + amount;
    if (newBalance < 0) {
      throw new BadRequestException('Insufficient balance');
    }

    wallet.balance = newBalance;
    return this.walletsRepository.save(wallet);
  }

  async getTotalBalance(userId: string, currency?: string): Promise<{
    total: number;
    wallets: Wallet[];
  }> {
    const wallets = await this.findAll(userId);
    
    if (currency) {
      const walletsInCurrency = wallets.filter(w => w.currency === currency);
      const total = walletsInCurrency.reduce((sum, w) => sum + w.balance, 0);
      return { total, wallets: walletsInCurrency };
    }

    // If no currency specified, return all wallets grouped by currency
    const total = wallets.reduce((sum, w) => sum + w.balance, 0);
    return { total, wallets };
  }
}

