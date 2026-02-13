import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import TelegramBot from 'node-telegram-bot-api';
import { User } from '../entities/user.entity';
import { VoiceService } from '../voice/voice.service';
import { ReceiptsService } from '../receipts/receipts.service';

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private bot: TelegramBot;

  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private voiceService: VoiceService,
    private receiptsService: ReceiptsService,
  ) {}

  onModuleInit() {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set, Telegram bot disabled');
      return;
    }

    const webhookUrl = this.configService.get<string>('TELEGRAM_WEBHOOK_URL');
    
    if (webhookUrl) {
      // Use webhook mode (production)
      this.bot = new TelegramBot(token);
      this.setupWebhook(webhookUrl);
    } else {
      // Use polling mode (development)
      this.bot = new TelegramBot(token, { polling: true });
      this.setupHandlers();
    }
    
    this.logger.log('Telegram bot initialized');
  }

  private async setupWebhook(webhookUrl: string) {
    try {
      await this.bot.setWebHook(`${webhookUrl}/telegram/webhook`);
      this.logger.log(`Telegram webhook set to: ${webhookUrl}/telegram/webhook`);
      
      // Set up handlers for webhook updates
      this.setupHandlers();
    } catch (error) {
      this.logger.error('Error setting Telegram webhook', error);
    }
  }

  // Handle webhook updates
  async handleUpdate(update: any) {
    try {
      // Handle different update types
      if (update.message) {
        const msg = update.message;
        
        // Handle voice messages first (priority)
        if (msg.voice) {
          await this.handleVoiceMessage(msg);
        }
        // Handle photos second (priority)
        else if (msg.photo) {
          await this.handlePhotoMessage(msg);
        }
        // Handle text messages last
        else if (msg.text) {
          if (msg.text.startsWith('/start')) {
            await this.bot.sendMessage(
              msg.chat.id,
              'Welcome to Expense Tracker! Send me a text message, voice message, or photo of a receipt to log expenses.',
            );
          } else if (msg.text.startsWith('/link')) {
            const email = msg.text.split(' ')[1];
            await this.handleLinkCommand(msg.chat.id, email);
          } else {
            // Regular text message - try to parse as expense
            await this.handleTextMessage(msg);
          }
        }
      }
    } catch (error) {
      this.logger.error('Error handling Telegram update', error);
    }
  }

  private setupHandlers() {
    // Start command
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      await this.bot.sendMessage(
        chatId,
        'Welcome to Expense Tracker! Send me a text message, voice message, or photo of a receipt to log expenses.',
      );
    });

    // Voice message handler (for polling mode)
    this.bot.on('voice', async (msg) => {
      await this.handleVoiceMessage(msg);
    });

    // Photo handler (for receipts) - polling mode
    this.bot.on('photo', async (msg) => {
      await this.handlePhotoMessage(msg);
    });

    // Link account command - polling mode
    this.bot.onText(/\/link (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const email = match[1];
      await this.handleLinkCommand(chatId, email);
    });

    // Text message handler (for non-command text) - polling mode
    this.bot.on('message', async (msg) => {
      // Only handle text messages that are not commands
      if (msg.text && !msg.text.startsWith('/') && !msg.voice && !msg.photo) {
        await this.handleTextMessage(msg);
      }
    });
  }

  // Refactored handlers that work for both polling and webhook
  private async handleVoiceMessage(msg: any) {
    try {
      const chatId = msg.chat.id;
      const user = await this.findUserByTelegramChatId(chatId.toString());
      
      if (!user) {
        await this.bot.sendMessage(
          chatId,
          'Please link your account first. Use /link <email> in the app.',
        );
        return;
      }

      await this.bot.sendMessage(chatId, 'Processing your voice message...');

      // Download voice file
      const file = await this.bot.getFile(msg.voice.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${this.configService.get('TELEGRAM_BOT_TOKEN')}/${file.file_path}`;
      
      // Convert voice to text
      const transcript = await this.convertVoiceToText(fileUrl);

      // Process voice message - returns array of expenses
      const expenses = await this.voiceService.processVoiceMessage(
        user.id,
        transcript,
        user.currency,
      );

      // Handle array of expenses
      if (Array.isArray(expenses) && expenses.length > 0) {
        const expenseList = expenses.map(e => `${e.description} - ${e.amount} ${e.currency}`).join('\n');
        await this.bot.sendMessage(
          chatId,
          `✅ ${expenses.length} expense(s) logged:\n${expenseList}`,
        );
      } else {
        await this.bot.sendMessage(
          chatId,
          '❌ No expenses found in your message. Please try again.',
        );
      }
    } catch (error) {
      this.logger.error('Error processing Telegram voice message', error);
      try {
        await this.bot.sendMessage(msg.chat.id, '❌ Error processing voice message. Please try again.');
      } catch (sendError) {
        this.logger.error('Error sending error message', sendError);
      }
    }
  }

  private async handlePhotoMessage(msg: any) {
    try {
      const chatId = msg.chat.id;
      const user = await this.findUserByTelegramChatId(chatId.toString());
      
      if (!user) {
        await this.bot.sendMessage(
          chatId,
          'Please link your account first. Use /link <email> in the app.',
        );
        return;
      }

      await this.bot.sendMessage(chatId, 'Processing receipt...');

      // Get largest photo
      const photo = msg.photo[msg.photo.length - 1];
      const file = await this.bot.getFile(photo.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${this.configService.get('TELEGRAM_BOT_TOKEN')}/${file.file_path}`;

      // Extract text from receipt
      const ocrText = await this.receiptsService.extractTextFromImage(fileUrl);

      // Process receipt
      const expense = await this.receiptsService.processReceipt(
        user.id,
        ocrText,
        fileUrl,
        user.currency,
      );

      await this.bot.sendMessage(
        chatId,
        `✅ Receipt processed: ${expense.merchant} - ${expense.amount} ${expense.currency}`,
      );
    } catch (error) {
      this.logger.error('Error processing Telegram photo', error);
      try {
        await this.bot.sendMessage(msg.chat.id, '❌ Error processing receipt. Please try again.');
      } catch (sendError) {
        this.logger.error('Error sending error message', sendError);
      }
    }
  }

  private async handleTextMessage(msg: any) {
    try {
      const chatId = msg.chat.id;
      const text = msg.text;
      const user = await this.findUserByTelegramChatId(chatId.toString());
      
      if (!user) {
        await this.bot.sendMessage(
          chatId,
          'Please link your account first. Use /link <email> in the app.',
        );
        return;
      }

      await this.bot.sendMessage(chatId, 'Processing your message...');

      // Process text message - returns array of expenses
      const expenses = await this.voiceService.processVoiceMessage(
        user.id,
        text,
        user.currency,
      );

      // Handle array of expenses
      if (Array.isArray(expenses) && expenses.length > 0) {
        const expenseList = expenses.map(e => `${e.description} - ${e.amount} ${e.currency}`).join('\n');
        await this.bot.sendMessage(
          chatId,
          `✅ ${expenses.length} expense(s) logged:\n${expenseList}`,
        );
      } else {
        await this.bot.sendMessage(
          chatId,
          'I couldn\'t understand that. Please send a text message like "I spent 50 dollars on groceries" or a receipt photo.',
        );
      }
    } catch (error) {
      this.logger.error('Error processing Telegram text message', error);
      try {
        await this.bot.sendMessage(msg.chat.id, '❌ Error processing your message. Please try again.');
      } catch (sendError) {
        this.logger.error('Error sending error message', sendError);
      }
    }
  }

  private async handleLinkCommand(chatId: number, email: string) {
    try {
      const user = await this.usersRepository.findOne({
        where: { email },
      });

      if (!user) {
        await this.bot.sendMessage(chatId, 'User not found. Please check your email.');
        return;
      }

      user.telegramChatId = chatId.toString();
      await this.usersRepository.save(user);

      await this.bot.sendMessage(chatId, '✅ Account linked successfully!');
    } catch (error) {
      this.logger.error('Error linking Telegram account', error);
      await this.bot.sendMessage(chatId, 'Error linking account. Please try again.');
    }
  }

  private async findUserByTelegramChatId(chatId: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { telegramChatId: chatId },
    });
  }

  private async convertVoiceToText(fileUrl: string): Promise<string> {
    try {
      // Download the audio file from Telegram
      const https = require('https');
      const http = require('http');
      const fs = require('fs');
      const path = require('path');
      
      const tempDir = path.join(process.cwd(), 'uploads', 'audio');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempFilePath = path.join(tempDir, `telegram-voice-${Date.now()}.ogg`);
      
      // Download file
      await new Promise((resolve, reject) => {
        const protocol = fileUrl.startsWith('https') ? https : http;
        const file = fs.createWriteStream(tempFilePath);
        
        protocol.get(fileUrl, (response: any) => {
          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download file: ${response.statusCode}`));
            return;
          }
          
          response.pipe(file);
          
          file.on('finish', () => {
            file.close();
            resolve(undefined);
          });
        }).on('error', (err: any) => {
          fs.unlinkSync(tempFilePath);
          reject(err);
        });
      });
      
      // Transcribe using VoiceService
      const transcript = await this.voiceService.transcribeAudio(tempFilePath);
      
      // Clean up temporary file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      
      return transcript;
    } catch (error) {
      this.logger.error('Error converting voice to text', error);
      throw error;
    }
  }
}

