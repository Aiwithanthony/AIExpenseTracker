import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ReceiptsService } from './receipts.service';
import { ReceiptsController } from './receipts.controller';
import { FileUploadService } from './file-upload.service';
import { LLMModule } from '../llm/llm.module';
import { ExpensesModule } from '../expenses/expenses.module';

@Module({
  imports: [HttpModule, LLMModule, ExpensesModule],
  controllers: [ReceiptsController],
  providers: [ReceiptsService, FileUploadService],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}

