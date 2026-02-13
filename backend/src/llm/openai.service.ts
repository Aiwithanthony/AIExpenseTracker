import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { LLMService } from './llm.interface';
import { ParsedExpense, ReceiptData } from '../common/types';

@Injectable()
export class OpenAIService implements LLMService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly openai: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required');
    }
    this.openai = new OpenAI({ apiKey });
  }

  async categorizeExpense(
    description: string,
    amount: number,
    merchant?: string,
    userCategories?: string[],
  ): Promise<string> {
    try {
      const defaultCategories = [
        'Food & Beverages',
        'Transportation',
        'Shopping',
        'Bills & Utilities',
        'Entertainment',
        'Healthcare',
        'Education',
        'Travel',
        'Groceries',
        'Clothing',
        'Other',
      ];

      const categories = userCategories?.length
        ? userCategories.join(', ')
        : defaultCategories.join(', ');

      const prompt = `Categorize this expense into one of these categories: ${categories}

Expense details:
- Description: ${description}
- Amount: ${amount}
- Merchant: ${merchant || 'Unknown'}

Return ONLY the category name, nothing else.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // Cost-effective model
        messages: [
          {
            role: 'system',
            content:
              'You are an expense categorization assistant. Return only the category name.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 50,
      });

      const category =
        response.choices[0]?.message?.content?.trim() || 'Other';
      return category;
    } catch (error) {
      this.logger.error('Error categorizing expense with OpenAI', error);
      return 'Other';
    }
  }

  async parseVoiceMessage(transcript: string): Promise<ParsedExpense[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const prompt = `Parse this voice message about expenses. The message may contain ONE or MULTIPLE expenses. Extract ALL expenses mentioned.

IMPORTANT: Today's date is ${today}.

For EACH expense, extract:
- amount (number only, no currency symbols)
- currency (3-letter code like USD, LBP, EUR, or null if not mentioned)
- description (SHORT description of what was purchased - 1-3 words only, like "coffee", "groceries", "gas", "lunch", "repair". DO NOT use the full sentence. Extract ONLY the item or service name)
- merchant (store/business name only, or null if not mentioned. Extract from phrases like "at [merchant]", "from [merchant]", "[merchant] shop". If merchant is part of description, separate them)
- date (ISO date string in YYYY-MM-DD format):
  * If the user mentions a relative date like "two days ago", "yesterday", "last week", "3 days ago", calculate the actual date from today's date (${today})
  * If the user mentions an absolute date, use that date
  * If no date is mentioned, use null (which will default to today)

CRITICAL RULES FOR DESCRIPTION:
- description MUST be short (1-3 words maximum)
- Extract ONLY the item/service name, NOT the full sentence
- If user says "I spent $200 at a coffee shop", description should be "coffee" (NOT "I spent $200 at a coffee shop")
- If user says "I bought groceries", description should be "groceries" (NOT "I bought groceries")
- If user says "paid for gas", description should be "gas" (NOT "paid for gas")
- merchant should be extracted separately - if mentioned, put it in merchant field, not description

CRITICAL RULES FOR MULTIPLE EXPENSES:
- For "I spent $100 at coffee shop and $200 at mechanical shop", extract TWO separate expenses
- Split by "and", "also", "plus", or similar conjunctions
- Each expense should have its own amount, description, and merchant

Voice message: "${transcript}"

Return a JSON object with an "expenses" array containing all expenses found. Each expense should have: amount, currency, description, merchant, date.

Example 1 - Single expense: "I spent $200 at a coffee shop"
{
  "expenses": [
    {
      "amount": 200,
      "currency": "USD",
      "description": "coffee",
      "merchant": "coffee shop",
      "date": null
    }
  ]
}

Example 2 - Multiple expenses: "I spent $100 at coffee shop and $200 at mechanical shop"
{
  "expenses": [
    {
      "amount": 100,
      "currency": "USD",
      "description": "coffee",
      "merchant": "coffee shop",
      "date": null
    },
    {
      "amount": 200,
      "currency": "USD",
      "description": "repair",
      "merchant": "mechanical shop",
      "date": null
    }
  ]
}

Example 3 - No merchant: "I spent $50 on groceries"
{
  "expenses": [
    {
      "amount": 50,
      "currency": "USD",
      "description": "groceries",
      "merchant": null,
      "date": null
    }
  ]
}

Example 4 - Multiple with dates: "I spent $30 on gas yesterday and $20 on lunch today"
{
  "expenses": [
    {
      "amount": 30,
      "currency": "USD",
      "description": "gas",
      "merchant": null,
      "date": "2024-01-14"
    },
    {
      "amount": 20,
      "currency": "USD",
      "description": "lunch",
      "merchant": null,
      "date": "2024-01-15"
    }
  ]
}

If only one expense is mentioned, return an array with one object.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an expense parsing assistant. Extract structured data from voice messages. Always return SHORT descriptions (1-3 words), never full sentences. Always return valid JSON with an "expenses" array.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(content);
      const expenses = parsed.expenses || [parsed]; // Support both array format and single object
      
      return expenses.map((exp: any) => ({
        amount: parseFloat(exp.amount) || 0,
        currency: exp.currency || undefined,
        description: exp.description ? exp.description.trim() : 'Expense', // Better fallback - short description
        merchant: exp.merchant || undefined,
        date: exp.date ? new Date(exp.date) : undefined,
      }));
    } catch (error) {
      this.logger.error('Error parsing voice message with OpenAI', error);
      throw error;
    }
  }

  async extractReceiptData(ocrText: string): Promise<ReceiptData> {
    try {
      const prompt = `Extract structured data from this receipt OCR text:

${ocrText}

Return a JSON object with:
- merchant (store name)
- amount (total amount as number)
- currency (3-letter code)
- date (ISO date string)
- items (array of {name: string, price: number}, optional)`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a receipt data extraction assistant. Return valid JSON only.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(content);
      return {
        merchant: parsed.merchant || 'Unknown',
        amount: parseFloat(parsed.amount) || 0,
        currency: parsed.currency || 'USD',
        date: parsed.date ? new Date(parsed.date) : new Date(),
        items: parsed.items || undefined,
      };
    } catch (error) {
      this.logger.error('Error extracting receipt data with OpenAI', error);
      throw error;
    }
  }

  async answerSpendingQuestion(question: string, context: string): Promise<string> {
    try {
      const prompt = `You are a helpful financial assistant. Answer the user's question about their spending based on the following context:

${context}

User's question: "${question}"

Provide a clear, helpful, and conversational answer. Be specific with numbers and categories when available. If the question cannot be answered with the provided context, politely say so.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a friendly and helpful financial assistant. Answer questions about spending patterns, categories, and expenses in a clear and conversational way.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const answer = response.choices[0]?.message?.content?.trim() || 
        "I'm sorry, I couldn't process your question. Please try again.";
      
      return answer;
    } catch (error) {
      this.logger.error('Error answering spending question with OpenAI', error);
      throw error;
    }
  }
}

