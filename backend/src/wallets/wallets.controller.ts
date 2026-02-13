import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { WalletsService, CreateWalletDto, UpdateWalletDto } from './wallets.service';

@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() createDto: CreateWalletDto) {
    return this.walletsService.create(user.id, createDto);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.walletsService.findAll(user.id);
  }

  @Get('total')
  getTotal(@CurrentUser() user: User, @Query('currency') currency?: string) {
    return this.walletsService.getTotalBalance(user.id, currency);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.walletsService.findOne(user.id, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() updateDto: UpdateWalletDto) {
    return this.walletsService.update(user.id, id, updateDto);
  }

  @Patch(':id/balance')
  updateBalance(@CurrentUser() user: User, @Param('id') id: string, @Body('amount') amount: number) {
    return this.walletsService.updateBalance(user.id, id, amount);
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.walletsService.remove(user.id, id);
  }
}

