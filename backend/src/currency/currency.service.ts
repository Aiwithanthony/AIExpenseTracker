import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface RateCacheEntry {
  rates: Record<string, number>;
  fetchedAt: number;
}

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.exchangerate-api.com/v4/latest';
  private readonly rateCache = new Map<string, RateCacheEntry>();
  private readonly CACHE_TTL_MS = 3600000; // 1 hour

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
      const exchangeRate = await this.getExchangeRate(fromCurrency, toCurrency);
      return amount * exchangeRate;
    } catch (error) {
      this.logger.error('Error converting currency', error);
      throw error;
    }
  }

  /**
   * Get exchange rate between two currencies (with caching)
   */
  async getExchangeRate(
    fromCurrency: string,
    toCurrency: string,
  ): Promise<number> {
    // Check cache first
    const cached = this.rateCache.get(fromCurrency);
    if (cached && Date.now() - cached.fetchedAt < this.CACHE_TTL_MS) {
      if (cached.rates[toCurrency] !== undefined) {
        return cached.rates[toCurrency];
      }
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/${fromCurrency}`, {
          timeout: 5000,
        }),
      );

      const rates = response.data.rates;
      if (!rates) {
        throw new Error(`No rates returned for ${fromCurrency}`);
      }

      // Cache the full rates response
      this.rateCache.set(fromCurrency, {
        rates,
        fetchedAt: Date.now(),
      });

      if (!rates[toCurrency]) {
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

  /**
   * Get all rates for a base currency (with caching).
   * Used for batch conversion in group balance calculations.
   */
  async getRatesForBase(baseCurrency: string): Promise<Record<string, number>> {
    const cached = this.rateCache.get(baseCurrency);
    if (cached && Date.now() - cached.fetchedAt < this.CACHE_TTL_MS) {
      return cached.rates;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/${baseCurrency}`, {
          timeout: 5000,
        }),
      );

      const rates = response.data.rates || {};
      this.rateCache.set(baseCurrency, {
        rates,
        fetchedAt: Date.now(),
      });

      return rates;
    } catch (error) {
      this.logger.error('Error fetching rates for base currency', error);
      // Return cached if available (even if stale)
      if (cached) {
        return cached.rates;
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
      return [
        'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY',
        'INR', 'LBP', 'AED', 'SAR', 'EGP', 'JOD', 'KWD', 'QAR',
      ];
    }
  }
}
