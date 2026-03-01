import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import {
  CreateGroupDto,
  UpdateGroupDto,
  AddGroupExpenseDto,
  CreateSettlementDto,
  JoinGroupDto,
  AddMembersDto,
  CreateInviteDto,
} from './groups.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  // --- Non-parameterized routes (must be before :id) ---

  @Get('search-users')
  searchUsers(@Query('q') query: string) {
    return this.groupsService.searchUsers(query);
  }

  @Post('join')
  joinByCode(@CurrentUser() user: User, @Body() dto: JoinGroupDto) {
    return this.groupsService.joinByCode(user.id, dto.inviteCode);
  }

  @Post('accept-invite/:token')
  acceptInvite(@CurrentUser() user: User, @Param('token') token: string) {
    return this.groupsService.acceptInvite(user.id, token);
  }

  // --- Group CRUD ---

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateGroupDto) {
    return this.groupsService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.groupsService.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.groupsService.findOne(user.id, id);
  }

  @Patch(':id')
  updateGroup(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateGroupDto) {
    return this.groupsService.updateGroup(user.id, id, dto);
  }

  @Delete(':id')
  deleteGroup(@CurrentUser() user: User, @Param('id') id: string) {
    return this.groupsService.deleteGroup(user.id, id);
  }

  // --- Members ---

  @Get(':id/members')
  getMembers(@CurrentUser() user: User, @Param('id') id: string) {
    return this.groupsService.getGroupMembers(user.id, id);
  }

  @Post(':id/members')
  addMembers(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: AddMembersDto) {
    return this.groupsService.addMembers(user.id, id, dto);
  }

  @Delete(':id/members/:userId')
  removeMember(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.groupsService.removeMember(user.id, id, userId);
  }

  // --- Expenses ---

  @Post(':id/expenses')
  addExpense(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: AddGroupExpenseDto) {
    return this.groupsService.addExpense(user.id, id, dto);
  }

  @Get(':id/expenses')
  getExpenses(@CurrentUser() user: User, @Param('id') id: string) {
    return this.groupsService.getGroupExpenses(user.id, id);
  }

  @Delete(':id/expenses/:expenseId')
  deleteExpense(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('expenseId') expenseId: string,
  ) {
    return this.groupsService.deleteExpense(user.id, id, expenseId);
  }

  // --- Balances ---

  @Get(':id/balances')
  getBalances(@CurrentUser() user: User, @Param('id') id: string) {
    return this.groupsService.getGroupBalances(user.id, id);
  }

  // --- Settlements ---

  @Post(':id/settlements')
  createSettlement(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: CreateSettlementDto,
  ) {
    return this.groupsService.createSettlement(user.id, id, dto);
  }

  @Get(':id/settlements')
  getSettlements(@CurrentUser() user: User, @Param('id') id: string) {
    return this.groupsService.getSettlements(user.id, id);
  }

  // --- Invites ---

  @Post(':id/invites')
  createInvite(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: CreateInviteDto) {
    return this.groupsService.createInvite(user.id, id, dto);
  }
}
