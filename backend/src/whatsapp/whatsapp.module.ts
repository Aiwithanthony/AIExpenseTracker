import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { User } from '../entities/user.entity';
import { VoiceModule } from '../voice/voice.module';
import { ReceiptsModule } from '../receipts/receipts.module';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([User]),
    VoiceModule,
    ReceiptsModule,
  ],
  controllers: [WhatsAppController],
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}

