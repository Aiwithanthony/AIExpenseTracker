import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LLMService } from './llm.interface';
import { OpenAIService } from './openai.service';
import { SelfHostedLLMService } from './self-hosted.service';

/**
 * LLM Module with provider switching based on LLM_PROVIDER env var
 * Supports: 'openai' (default) or 'self-hosted'
 */
@Module({
  imports: [HttpModule, ConfigModule],
  providers: [
    OpenAIService,
    SelfHostedLLMService,
    {
      provide: 'LLM_SERVICE',
      useFactory: (
        configService: ConfigService,
        openaiService: OpenAIService,
        selfHostedService: SelfHostedLLMService,
      ): LLMService => {
        const provider = configService.get<string>('LLM_PROVIDER', 'openai');
        
        if (provider === 'self-hosted') {
          return selfHostedService;
        }
        
        return openaiService;
      },
      inject: [ConfigService, OpenAIService, SelfHostedLLMService],
    },
  ],
  exports: ['LLM_SERVICE'],
})
export class LLMModule {}

