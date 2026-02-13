import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import type { LLMService } from '../llm/llm.interface';
import { ExpensesService } from '../expenses/expenses.service';
import { CategoriesService } from '../categories/categories.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Inject('LLM_SERVICE')
    private llmService: LLMService,
    private expensesService: ExpensesService,
    private categoriesService: CategoriesService,
  ) {}

  async answerQuestion(
    userId: string,
    question: string,
    userCurrency?: string,
  ): Promise<string> {
    try {
      // Get spending data for context
      const stats = await this.expensesService.getStats(userId);
      const recentExpenses = await this.expensesService.findAll(userId, {
        limit: 20,
      });
      const categories = await this.categoriesService.findAll(userId);

      // Prepare context for LLM
      const context = this.buildContext(stats, recentExpenses.expenses, categories, userCurrency);

      // Use LLM to answer the question
      const answer = await this.llmService.answerSpendingQuestion(question, context);

      return answer;
    } catch (error) {
      this.logger.error('Error answering question', error);
      throw error;
    }
  }

  private buildContext(
    stats: any,
    expenses: any[],
    categories: any[],
    currency?: string,
  ): string {
    const currencySymbol = currency || 'USD';
    
    let context = `User's Spending Summary:\n`;
    context += `- Total Spent: ${stats.total?.toFixed(2) || '0.00'} ${currencySymbol}\n`;
    context += `- Average Per Day: ${stats.averagePerDay?.toFixed(2) || '0.00'} ${currencySymbol}\n\n`;

    if (stats.byCategory && Object.keys(stats.byCategory).length > 0) {
      context += `Spending by Category:\n`;
      Object.entries(stats.byCategory)
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, 10)
        .forEach(([category, amount]: any) => {
          context += `- ${category}: ${amount?.toFixed(2) || '0.00'} ${currencySymbol}\n`;
        });
      context += '\n';
    }

    if (expenses.length > 0) {
      context += `Recent Expenses (last ${expenses.length}):\n`;
      expenses.slice(0, 10).forEach((expense) => {
        const amount = typeof expense.amount === 'string' ? parseFloat(expense.amount) : Number(expense.amount);
        context += `- ${expense.description || 'No description'}: ${amount?.toFixed(2) || '0.00'} ${expense.currency || currencySymbol}`;
        if (expense.category) {
          context += ` (${expense.category.name})`;
        }
        if (expense.merchant) {
          context += ` at ${expense.merchant}`;
        }
        context += `\n`;
      });
      context += '\n';
    }

    if (categories.length > 0) {
      context += `Available Categories: ${categories.map((c) => c.name).join(', ')}\n`;
    }

    return context;
  }
}

