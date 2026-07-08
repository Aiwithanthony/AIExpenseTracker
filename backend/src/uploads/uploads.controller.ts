import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { basename, join } from 'path';
import { existsSync } from 'fs';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { Expense } from '../entities/expense.entity';

/**
 * Serves user-uploaded receipt images behind authentication + an ownership
 * check. Replaces the previous public `useStaticAssets('/uploads')` mount,
 * which exposed every user's receipts (and audio) to anyone who could guess a
 * filename.
 */
@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  private readonly receiptsDir = join(process.cwd(), 'uploads', 'receipts');

  constructor(
    @InjectRepository(Expense)
    private readonly expensesRepository: Repository<Expense>,
  ) {}

  @Get('receipts/:filename')
  async getReceipt(
    @CurrentUser() user: User,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    // Prevent path traversal — collapse to a bare filename.
    const safeName = basename(filename);
    if (safeName !== filename || safeName.includes('..')) {
      throw new ForbiddenException('Invalid filename');
    }

    // Ownership: the caller must own an expense whose receipt is this file.
    const owned = await this.expensesRepository.findOne({
      where: {
        userId: user.id,
        receiptImageUrl: Like(`%/uploads/receipts/${safeName}`),
      },
      select: ['id'],
    });
    if (!owned) {
      // 404 (not 403) so a caller can't probe which filenames exist.
      throw new NotFoundException('Receipt not found');
    }

    const absolutePath = join(this.receiptsDir, safeName);
    if (!existsSync(absolutePath)) {
      throw new NotFoundException('Receipt not found');
    }

    return res.sendFile(absolutePath);
  }
}
