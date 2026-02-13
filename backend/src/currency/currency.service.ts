import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.exchangerate-api.com/v4/latest';

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('EXCHANGE_RATE_API_KEY') || '';
  }

  /**
   * Convert amount from one currency to another
   */
  async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<number> {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    try {
      // Use free exchangerate-api.com (no API key needed for basic usage)
      // Or use fixer.io if API key is provided
      const exchangeRate = await this.getExchangeRate(fromCurrency, toCurrency);
      return amount * exchangeRate;
    } catch (error) {
      this.logger.error('Error converting currency', error);
      throw error;
    }
  }

  /**
   * Get exchange rate between two currencies
   */
  async getExchangeRate(
    fromCurrency: string,
    toCurrency: string,
  ): Promise<number> {
    try {
      // Try free API first (exchangerate-api.com)
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/${fromCurrency}`, {
          timeout: 5000,
        }),
      );

      const rates = response.data.rates;
      if (!rates || !rates[toCurrency]) {
        throw new Error(`Exchange rate not found for ${toCurrency}`);
      }

      return rates[toCurrency];
    } catch (error) {
      this.logger.error('Error fetching exchange rate', error);
      
      // Fallback: try fixer.io if API key is available
      if (this.apiKey) {
        return this.getExchangeRateFromFixer(fromCurrency, toCurrency);
      }
      
      throw error;
    }
  }

  private async getExchangeRateFromFixer(
    fromCurrency: string,
    toCurrency: string,
  ): Promise<number> {
    try {
      const response = await firstValueFrom(
        this.httpService.get('https://api.fixer.io/latest', {
          params: {
            access_key: this.apiKey,
            base: fromCurrency,
            symbols: toCurrency,
          },
          timeout: 5000,
        }),
      );

      return response.data.rates[toCurrency];
    } catch (error) {
      this.logger.error('Error fetching from Fixer.io', error);
      throw error;
    }
  }

  /**
   * Get all supported currencies
   */
  async getSupportedCurrencies(): Promise<string[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/USD`, {
          timeout: 5000,
        }),
      );

      return Object.keys(response.data.rates || {}).concat(['USD']);
    } catch (error) {
      this.logger.error('Error fetching supported currencies', error);
      // Return common currencies as fallback
      return [
        'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY',
        'INR', 'LBP', 'AED', 'SAR', 'EGP', 'JOD', 'KWD', 'QAR',
      ];
    }
  }
}

