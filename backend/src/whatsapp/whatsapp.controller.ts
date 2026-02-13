import { Controller, Get, Post, Body, Query, Req, Res } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { Request } from 'express';
import type { Response } from 'express';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const result = this.whatsappService.verifyWebhook(mode, token, challenge);
    
    if (result) {
      return res.status(200).send(result);
    }
    
    return res.status(403).send('Forbidden');
  }

  @Post('webhook')
  async handleWebhook(@Body() body: any) {
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        await this.whatsappService.handleMessage(entry);
      }
    }
    
    return { status: 'ok' };
  }
}

