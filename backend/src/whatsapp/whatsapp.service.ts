import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { User } from '../entities/user.entity';
import { VoiceService } from '../voice/voice.service';
import { ReceiptsService } from '../receipts/receipts.service';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiKey: string;
  private readonly phoneNumberId: string;
  private readonly apiUrl: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private voiceService: VoiceService,
    private receiptsService: ReceiptsService,
  ) {
    this.apiKey = this.configService.get<string>('WHATSAPP_API_KEY') || '';
    this.phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID') || '';
    this.apiUrl = `https://graph.facebook.com/v18.0/${this.phoneNumberId}`;
  }

  /**
   * Verify webhook (for WhatsApp Business API setup)
   */
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    const verifyToken = this.configService.get<string>('WHATSAPP_VERIFY_TOKEN');
    
    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }
    
    return null;
  }

  /**
   * Handle incoming WhatsApp message
   */
  async handleMessage(entry: any) {
    try {
      const message = entry.changes?.[0]?.value?.messages?.[0];
      if (!message) return;

      const from = message.from;
      const user = await this.findUserByWhatsAppNumber(from);

      if (!user) {
        await this.sendMessage(
          from,
          'Please link your WhatsApp number in the app settings first.',
        );
        return;
      }

      // Handle voice message
      if (message.type === 'audio' || message.type === 'voice') {
        await this.handleVoiceMessage(message, user);
      }
      // Handle image (receipt)
      else if (message.type === 'image') {
        await this.handleImageMessage(message, user);
      }
      // Handle text message
      else if (message.type === 'text') {
        await this.handleTextMessage(message, user);
      }
    } catch (error) {
      this.logger.error('Error handling WhatsApp message', error);
    }
  }

  private async handleVoiceMessage(message: any, user: User) {
    try {
      await this.sendMessage(user.whatsappNumber, 'Processing your voice message...');

      // Get media URL
      const mediaId = message.audio?.id || message.voice?.id;
      const mediaUrl = await this.getMediaUrl(mediaId);

      // Convert voice to text
      const transcript = await this.convertVoiceToText(mediaUrl);

      // Process voice message - returns array of expenses
      const expenses = await this.voiceService.processVoiceMessage(
        user.id,
        transcript,
        user.currency,
      );

      // Handle array of expenses
      if (Array.isArray(expenses) && expenses.length > 0) {
        const expenseList = expenses.map(e => `${e.description} - ${e.amount} ${e.currency}`).join('\n');
        await this.sendMessage(
          user.whatsappNumber,
          `✅ ${expenses.length} expense(s) logged:\n${expenseList}`,
        );
      } else {
        await this.sendMessage(
          user.whatsappNumber,
          '❌ No expenses found in your message. Please try again.',
        );
      }
    } catch (error) {
      this.logger.error('Error processing WhatsApp voice message', error);
      await this.sendMessage(
        user.whatsappNumber,
        'Sorry, I had trouble processing your voice message. Please try again.',
      );
    }
  }

  private async handleImageMessage(message: any, user: User) {
    try {
      await this.sendMessage(user.whatsappNumber, 'Processing receipt...');

      // Get media URL
      const mediaId = message.image.id;
      const mediaUrl = await this.getMediaUrl(mediaId);

      // Extract text from receipt
      const ocrText = await this.receiptsService.extractTextFromImage(mediaUrl);

      // Process receipt
      const expense = await this.receiptsService.processReceipt(
        user.id,
        ocrText,
        mediaUrl,
        user.currency,
      );

      await this.sendMessage(
        user.whatsappNumber,
        `✅ Receipt processed: ${expense.merchant} - ${expense.amount} ${expense.currency}`,
      );
    } catch (error) {
      this.logger.error('Error processing WhatsApp image', error);
      await this.sendMessage(
        user.whatsappNumber,
        'Sorry, I had trouble processing your receipt. Please try again.',
      );
    }
  }

  private async handleTextMessage(message: any, user: User) {
    // For text messages, try to parse as expense
    const text = message.text.body;
    
    try {
      // Process text message - returns array of expenses
      const expenses = await this.voiceService.processVoiceMessage(
        user.id,
        text,
        user.currency,
      );

      // Handle array of expenses
      if (Array.isArray(expenses) && expenses.length > 0) {
        const expenseList = expenses.map(e => `${e.description} - ${e.amount} ${e.currency}`).join('\n');
        await this.sendMessage(
          user.whatsappNumber,
          `✅ ${expenses.length} expense(s) logged:\n${expenseList}`,
        );
      } else {
        await this.sendMessage(
          user.whatsappNumber,
          'I couldn\'t understand that. Please send a voice message or receipt photo.',
        );
      }
    } catch (error) {
      await this.sendMessage(
        user.whatsappNumber,
        'I couldn\'t understand that. Please send a voice message or receipt photo.',
      );
    }
  }

  private async sendMessage(to: string, text: string) {
    try {
      await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/messages`,
          {
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body: text },
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );
    } catch (error) {
      this.logger.error('Error sending WhatsApp message', error);
    }
  }

  private async getMediaUrl(mediaId: string): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`https://graph.facebook.com/v18.0/${mediaId}`, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }),
      );

      return response.data.url;
    } catch (error) {
      this.logger.error('Error getting media URL', error);
      throw error;
    }
  }

  private async findUserByWhatsAppNumber(phoneNumber: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { whatsappNumber: phoneNumber },
    });
  }

  private async convertVoiceToText(fileUrl: string): Promise<string> {
    // TODO: Integrate with speech-to-text service
    this.logger.warn('Voice-to-text not implemented, using placeholder');
    return 'Expense description from voice message';
  }
}

