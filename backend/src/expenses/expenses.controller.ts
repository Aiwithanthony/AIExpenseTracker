import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { ExpensesService, CreateExpenseDto, UpdateExpenseDto, ExpenseQueryDto } from './expenses.service';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(
    private readonly expensesService: ExpensesService,
    private readonly exportService: ExportService,
  ) {}

  @Post()
  create(@CurrentUser() user: User, @Body() createDto: CreateExpenseDto) {
    return this.expensesService.create(user.id, createDto, user.currency);
  }

  @Get()
  findAll(@CurrentUser() user: User, @Query() query: ExpenseQueryDto) {
    return this.expensesService.findAll(user.id, query);
  }

  @Post('reconvert')
  reconvert(@CurrentUser() user: User) {
    return this.expensesService.reconvertAllForUser(user.id, user.currency);
  }

  @Get('stats')
  getStats(
    @CurrentUser() user: User,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.expensesService.getStats(
      user.id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      user.currency,
    );
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.expensesService.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updateDto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(user.id, id, updateDto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.expensesService.remove(user.id, id);
  }

  @Get('export/csv')
  @Header('Content-Type', 'text/csv')
  async exportCSV(
    @CurrentUser() user: User,
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const csv = await this.exportService.exportToCSV(
      user.id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
    res.setHeader('Content-Disposition', `attachment; filename="expenses-${Date.now()}.csv"`);
    res.send(csv);
  }

  @Get('export/json')
  @Header('Content-Type', 'application/json')
  async exportJSON(
    @CurrentUser() user: User,
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const data = await this.exportService.exportToJSON(
      user.id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
    res.setHeader('Content-Disposition', `attachment; filename="expenses-${Date.now()}.json"`);
    res.json(data);
  }
}

