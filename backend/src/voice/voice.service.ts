import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { createReadStream } from 'fs';
import type { LLMService } from '../llm/llm.interface';
import { ExpensesService } from '../expenses/expenses.service';
import { ExpenseSource } from '../entities/expense.entity';

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);
  private readonly openai: OpenAI;

  constructor(
    @Inject('LLM_SERVICE')
    private llmService: LLMService,
    private expensesService: ExpensesService,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  /**
   * Transcribe audio file to text using OpenAI Whisper
   */
  async transcribeAudio(audioFilePath: string): Promise<string> {
    try {
      if (!this.openai) {
        throw new Error('OpenAI API key not configured');
      }

      const transcription = await this.openai.audio.transcriptions.create({
        file: createReadStream(audioFilePath) as any,
        model: 'whisper-1',
        // Language auto-detection: Whisper will automatically detect the language
      });

      return transcription.text;
    } catch (error) {
      this.logger.error('Error transcribing audio', error);
      throw error;
    }
  }

  /**
   * Transcribe audio from base64 data
   */
  async transcribeAudioFromBase64(base64Audio: string, mimeType: string = 'audio/m4a'): Promise<string> {
    try {
      if (!this.openai) {
        throw new Error('OpenAI API key not configured');
      }

      // Convert base64 to buffer
      const audioBuffer = Buffer.from(base64Audio, 'base64');

      // Create a temporary file for OpenAI API (it requires a file path or File object)
      const fs = require('fs');
      const path = require('path');
      const tempDir = path.join(process.cwd(), 'uploads', 'audio');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFilePath = path.join(tempDir, `temp-${Date.now()}.m4a`);
      fs.writeFileSync(tempFilePath, audioBuffer);

      try {
        // Use the file path for transcription
        const transcription = await this.openai.audio.transcriptions.create({
          file: createReadStream(tempFilePath) as any,
          model: 'whisper-1',
          // Language auto-detection: Whisper will automatically detect the language
        });

        return transcription.text;
      } finally {
        // Clean up temp file
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      }
    } catch (error) {
      this.logger.error('Error transcribing audio from base64', error);
      throw error;
    }
  }

  /**
   * Sanitize description to ensure it's short (1-3 words)
   * If LLM returns full sentence, extract the key part
   */
  private sanitizeDescription(description: string, merchant?: string): string {
    if (!description) return 'Expense';
    
    const trimmed = description.trim();
    const words = trimmed.split(/\s+/);
    
    // If already short (3 words or less), return as is
    if (words.length <= 3) {
      return trimmed;
    }
    
    // If description is too long, try to extract key parts
    // Common patterns to extract from:
    // "I spent $200 at coffee shop" -> "coffee"
    // "paid for groceries" -> "groceries"
    // "bought gas" -> "gas"
    
    // Remove common prefixes
    const prefixes = [
      /^i\s+(spent|paid|bought|purchased)\s+/i,
      /^(spent|paid|bought|purchased)\s+/i,
      /^i\s+/i,
    ];
    
    let cleaned = trimmed;
    for (const prefix of prefixes) {
      cleaned = cleaned.replace(prefix, '');
    }
    
    // Remove amount patterns like "$200", "200 dollars", etc.
    cleaned = cleaned.replace(/\$\d+(\.\d+)?/g, '');
    cleaned = cleaned.replace(/\d+(\.\d+)?\s*(dollars?|usd|lbp|eur)/gi, '');
    cleaned = cleaned.replace(/\d+(\.\d+)?/g, '');
    
    // Remove common connectors and articles
    cleaned = cleaned.replace(/\s+(at|from|for|on|in|the|a|an)\s+/gi, ' ');
    cleaned = cleaned.replace(/^(at|from|for|on|in|the|a|an)\s+/i, '');
    cleaned = cleaned.replace(/\s+(at|from|for|on|in|the|a|an)$/i, '');
    
    // Take first 1-3 meaningful words
    const stopWords = new Set(['at', 'the', 'a', 'an', 'for', 'on', 'in', 'from', 'to', 'with', 'and', 'or']);
    const meaningfulWords = cleaned.split(/\s+/).filter(w => 
      w.length > 0 && 
      !stopWords.has(w.toLowerCase()) &&
      !/^\d+$/.test(w) // Remove standalone numbers
    );
    
    if (meaningfulWords.length > 0) {
      const result = meaningfulWords.slice(0, 3).join(' ');
      // If result is still too long, take just the first word
      if (result.split(/\s+/).length > 3) {
        return meaningfulWords[0] || 'Expense';
      }
      return result;
    }
    
    // If merchant exists and description is too long, use merchant as fallback
    if (merchant && merchant.length <= 20) {
      return merchant;
    }
    
    // Last resort: use first word or "Expense"
    return words[0] || 'Expense';
  }

  /**
   * Process voice message transcript and create expense(s)
   * Now supports multiple expenses in a single message
   */
  async processVoiceMessage(
    userId: string,
    transcript: string,
    userCurrency: string,
  ) {
    try {
      // Parse voice message using LLM - now returns an array
      const parsedExpenses = await this.llmService.parseVoiceMessage(transcript);

      // Create expenses from parsed data
      const createdExpenses = await Promise.all(
        parsedExpenses.map((parsed) => {
          // Sanitize description to ensure it's short
          const sanitizedDescription = this.sanitizeDescription(
            parsed.description,
            parsed.merchant,
          );
          
          this.logger.log(
            `Sanitized description: "${parsed.description}" -> "${sanitizedDescription}"`,
          );
          
          return this.expensesService.create(
            userId,
            {
              amount: parsed.amount,
              currency: parsed.currency || userCurrency,
              description: sanitizedDescription, // Use sanitized description
              merchant: parsed.merchant,
              date: parsed.date,
              source: ExpenseSource.VOICE_APP,
            },
            userCurrency,
          );
        }),
      );

      return createdExpenses; // Return array of expenses
    } catch (error) {
      this.logger.error('Error processing voice message', error);
      throw error;
    }
  }

  /**
   * Transcribe audio and process it into expenses in one operation
   * This reduces API round trips and improves user experience
   */
  async transcribeAndProcessAudio(
    userId: string,
    audioFilePath: string,
    userCurrency: string,
  ) {
    try {
      // Step 1: Transcribe audio
      this.logger.log('Transcribing audio file...');
      const transcript = await this.transcribeAudio(audioFilePath);
      
      if (!transcript || transcript.trim().length === 0) {
        throw new Error('No speech detected in audio');
      }

      this.logger.log(`Transcript: ${transcript.substring(0, 100)}...`);

      // Step 2: Process transcript into expenses
      this.logger.log('Processing transcript into expenses...');
      return await this.processVoiceMessage(userId, transcript, userCurrency);
    } catch (error) {
      this.logger.error('Error transcribing and processing audio', error);
      throw error;
    }
  }
}

