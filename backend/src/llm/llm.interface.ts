import { ParsedExpense, ReceiptData } from '../common/types';

/**
 * Abstract interface for LLM services
 * Allows easy switching between OpenAI, Anthropic, or self-hosted LLMs
 */
export interface LLMService {
  /**
   * Categorize an expense based on description, amount, and merchant
   */
  categorizeExpense(
    description: string,
    amount: number,
    merchant?: string,
    userCategories?: string[],
  ): Promise<string>;

  /**
   * Parse a voice message transcript into structured expense data
   * Returns an array to support multiple expenses in a single message
   */
  parseVoiceMessage(transcript: string): Promise<ParsedExpense[]>;

  /**
   * Extract structured data from OCR text of a receipt
   */
  extractReceiptData(ocrText: string): Promise<ReceiptData>;

  /**
   * Answer questions about spending using context
   */
  answerSpendingQuestion(question: string, context: string): Promise<string>;
}

