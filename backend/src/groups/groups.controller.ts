import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { GroupsService, CreateGroupDto, AddExpenseToGroupDto } from './groups.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() createDto: CreateGroupDto) {
    return this.groupsService.create(user.id, createDto);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.groupsService.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.groupsService.findOne(user.id, id);
  }

  @Get(':id/expenses')
  getExpenses(@CurrentUser() user: User, @Param('id') id: string) {
    return this.groupsService.getGroupExpenses(user.id, id);
  }

  @Post(':id/expenses')
  addExpense(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: AddExpenseToGroupDto,
  ) {
    return this.groupsService.addExpense(user.id, id, dto);
  }

  @Delete(':id')
  deleteGroup(@CurrentUser() user: User, @Param('id') id: string) {
    return this.groupsService.deleteGroup(user.id, id);
  }
}

