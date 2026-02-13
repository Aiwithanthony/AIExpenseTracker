import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrencyService } from './currency.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('currency')
@UseGuards(JwtAuthGuard)
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get('convert')
  async convert(
    @Query('amount') amount: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const converted = await this.currencyService.convert(
      parseFloat(amount),
      from,
      to,
    );
    return {
      amount: parseFloat(amount),
      from,
      to,
      converted,
      rate: converted / parseFloat(amount),
    };
  }

  @Get('supported')
  async getSupportedCurrencies() {
    return this.currencyService.getSupportedCurrencies();
  }
}

