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
import { BillsService, CreateBillDto, UpdateBillDto } from './bills.service';

@Controller('bills')
@UseGuards(JwtAuthGuard)
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() createDto: CreateBillDto) {
    return this.billsService.create(user.id, createDto);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.billsService.findAll(user.id);
  }

  @Get('upcoming')
  getUpcoming(@CurrentUser() user: User, @Query('days') days?: string) {
    return this.billsService.getUpcomingBills(user.id, days ? parseInt(days) : 7);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.billsService.findOne(user.id, id);
  }

  @Post(':id/mark-paid')
  markAsPaid(@CurrentUser() user: User, @Param('id') id: string) {
    return this.billsService.markAsPaid(user.id, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() updateDto: UpdateBillDto) {
    return this.billsService.update(user.id, id, updateDto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.billsService.remove(user.id, id);
  }
}

