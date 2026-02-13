import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';

export class AskQuestionDto {
  @IsString()
  question: string;
}

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('ask')
  async askQuestion(
    @CurrentUser() user: User,
    @Body() dto: AskQuestionDto,
  ) {
    const answer = await this.chatService.answerQuestion(
      user.id,
      dto.question,
      user.currency,
    );
    return { answer };
  }
}

