import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import type { LLMService } from '../llm/llm.interface';
import { ExpensesService } from '../expenses/expenses.service';
import { ExpenseSource } from '../entities/expense.entity';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class ReceiptsService {
  private readonly logger = new Logger(ReceiptsService.name);

  constructor(
    @Inject('LLM_SERVICE')
    private llmService: LLMService,
    private expensesService: ExpensesService,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  /**
   * Extract text from receipt image using OCR
   */
  async extractTextFromImage(imageUrl: string): Promise<string> {
    try {
      // Option 1: Use Google Cloud Vision API (if configured)
      const googleApiKey = this.configService.get<string>('GOOGLE_VISION_API_KEY');
      if (googleApiKey) {
        return this.extractWithGoogleVision(imageUrl, googleApiKey);
      }

      // Option 2: Use Tesseract.js (client-side) or another OCR service
      // For now, return placeholder - OCR should be done client-side or via dedicated service
      throw new Error('OCR service not configured. Please set GOOGLE_VISION_API_KEY or use client-side OCR.');
    } catch (error) {
      this.logger.error('Error extracting text from image', error);
      throw error;
    }
  }

  private async extractWithGoogleVision(
    imageUrl: string,
    apiKey: string,
  ): Promise<string> {
    try {
      let imageData: { source?: { imageUri: string }; content?: string };

      // Check if imageUrl is a local file path or URL
      if (imageUrl.startsWith('http://localhost') || imageUrl.startsWith('http://127.0.0.1')) {
        // Local file - read and convert to base64
        const filename = imageUrl.split('/').pop();
        const filePath = join(process.cwd(), 'uploads', 'receipts', filename || '');
        try {
          const imageBuffer = readFileSync(filePath);
          const base64Image = imageBuffer.toString('base64');
          imageData = { content: base64Image };
        } catch (fileError) {
          this.logger.warn(`Could not read local file ${filePath}, trying as URL`);
          // Fallback to URL if file not found
          imageData = { source: { imageUri: imageUrl } };
        }
      } else if (imageUrl.startsWith('data:image')) {
        // Base64 data URL - extract base64 part
        const base64Match = imageUrl.match(/^data:image\/\w+;base64,(.+)$/);
        if (base64Match) {
          imageData = { content: base64Match[1] };
        } else {
          throw new Error('Invalid base64 image format');
        }
      } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        // Public URL - use imageUri
        imageData = { source: { imageUri: imageUrl } };
      } else {
        // Assume it's a local filename
        const filePath = join(process.cwd(), 'uploads', 'receipts', imageUrl);
        try {
          const imageBuffer = readFileSync(filePath);
          const base64Image = imageBuffer.toString('base64');
          imageData = { content: base64Image };
        } catch (fileError) {
          throw new Error(`Could not read image file: ${filePath}`);
        }
      }

      const response = await firstValueFrom(
        this.httpService.post(
          `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
          {
            requests: [
              {
                image: imageData,
                features: [{ type: 'TEXT_DETECTION' }],
              },
            ],
          },
        ),
      );

      const textAnnotations = response.data.responses[0]?.textAnnotations;
      if (!textAnnotations || textAnnotations.length === 0) {
        return '';
      }

      // Return full text (first annotation contains all text)
      return textAnnotations[0].description || '';
    } catch (error) {
      this.logger.error('Error with Google Vision API', error);
      throw error;
    }
  }

  /**
   * Process receipt OCR text and create expense
   */
  async processReceipt(
    userId: string,
    ocrText: string,
    imageInput: string, // Can be imageUrl or base64
    userCurrency: string,
  ) {
    try {
      // Extract structured data from receipt using LLM
      const receiptData = await this.llmService.extractReceiptData(ocrText);

      // For base64 images, we can store the data URL or save to file
      // For now, store base64 directly (in production, save to cloud storage)
      const receiptImageUrl = imageInput.startsWith('data:image')
        ? imageInput // Store base64 data URL
        : imageInput; // Store regular URL

      // Build description with items for better categorization
      let description = `Receipt from ${receiptData.merchant}`;
      if (receiptData.items && receiptData.items.length > 0) {
        const itemNames = receiptData.items
          .slice(0, 5) // Limit to first 5 items to keep description concise
          .map((item) => item.name)
          .join(', ');
        description = `${itemNames} from ${receiptData.merchant}`;
        if (receiptData.items.length > 5) {
          description += ` (+${receiptData.items.length - 5} more items)`;
        }
      }

      // Create expense from receipt data
      const expense = await this.expensesService.create(
        userId,
        {
          amount: receiptData.amount,
          currency: receiptData.currency,
          description: description,
          merchant: receiptData.merchant,
          date: receiptData.date,
          receiptImageUrl: receiptImageUrl,
          source: ExpenseSource.RECEIPT_SCAN,
        },
        userCurrency,
      );

      return expense;
    } catch (error) {
      this.logger.error('Error processing receipt', error);
      throw error;
    }
  }
}

