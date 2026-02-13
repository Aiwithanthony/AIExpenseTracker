import { Controller, Post, Body, Get, Res } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import type { Response } from 'express';

@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Post('webhook')
  async handleWebhook(@Body() body: any) {
    // Telegram sends updates as a message object directly
    if (body.message || body.callback_query) {
      await this.telegramService.handleUpdate(body);
    }
    
    return { status: 'ok' };
  }

  @Get('webhook')
  async verifyWebhook(@Res() res: Response) {
    // Telegram webhook verification (if needed)
    return res.status(200).send('OK');
  }
}

