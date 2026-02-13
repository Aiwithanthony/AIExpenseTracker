import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpensesService } from './expenses.service';
import { ExportService } from './export.service';
import { ExpensesController } from './expenses.controller';
import { Expense } from '../entities/expense.entity';
import { Category } from '../entities/category.entity';
import { LLMModule } from '../llm/llm.module';
import { CurrencyModule } from '../currency/currency.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Expense, Category]),
    LLMModule,
    CurrencyModule,
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService, ExportService],
  exports: [ExpensesService, ExportService],
})
export class ExpensesModule {}

