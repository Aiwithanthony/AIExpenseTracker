import { Module } from '@nestjs/common';
import { VoiceService } from './voice.service';
import { VoiceController } from './voice.controller';
import { LLMModule } from '../llm/llm.module';
import { ExpensesModule } from '../expenses/expenses.module';

@Module({
  imports: [LLMModule, ExpensesModule],
  controllers: [VoiceController],
  providers: [VoiceService],
  exports: [VoiceService],
})
export class VoiceModule {}

