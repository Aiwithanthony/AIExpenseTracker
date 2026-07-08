import {
  Controller,
  Post,
  Body,
  Get,
  Res,
  Headers,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import type { Response } from 'express';

@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  /**
   * Authenticated: issue a one-time code the user sends to the bot as
   * `/link <code>` to bind their Telegram chat. Replaces the old, forgeable
   * `/link <email>` flow.
   */
  @Post('link-code')
  @UseGuards(JwtAuthGuard)
  async createLinkCode(@CurrentUser() user: User) {
    const { code, expiresAt } = await this.telegramService.generateLinkCode(user.id);
    return {
      code,
      expiresAt,
      instructions: `Open Telegram, start the bot, and send: /link ${code}`,
    };
  }

  @Post('webhook')
  async handleWebhook(
    @Body() body: any,
    @Headers('x-telegram-bot-api-secret-token') secretToken?: string,
  ) {
    // Reject forged updates: only accept POSTs carrying the secret token we
    // registered with Telegram via setWebHook.
    if (!this.telegramService.verifyWebhookSecret(secretToken)) {
      throw new ForbiddenException('Invalid webhook secret');
    }

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
