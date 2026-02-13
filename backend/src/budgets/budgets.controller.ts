import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { BudgetsService, CreateBudgetDto, UpdateBudgetDto } from './budgets.service';

@Controller('budgets')
@UseGuards(JwtAuthGuard)
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() createDto: CreateBudgetDto) {
    return this.budgetsService.create(user.id, createDto);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.budgetsService.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.budgetsService.findOne(user.id, id);
  }

  @Get(':id/status')
  getStatus(@CurrentUser() user: User, @Param('id') id: string) {
    return this.budgetsService.getBudgetStatus(user.id, id);
  }

  @Get('alerts/check')
  checkAlerts(@CurrentUser() user: User) {
    return this.budgetsService.checkBudgetAlerts(user.id);
  }

  @Patch(':id')
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() updateDto: UpdateBudgetDto) {
    return this.budgetsService.update(user.id, id, updateDto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.budgetsService.remove(user.id, id);
  }
}

