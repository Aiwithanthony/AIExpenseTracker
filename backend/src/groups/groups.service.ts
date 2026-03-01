import {
  Injectable,
  OnModuleInit,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  GoneException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExpenseGroup } from '../entities/expense-group.entity';
import { GroupExpense, SplitType } from '../entities/group-expense.entity';
import { GroupMember } from '../entities/group-member.entity';
import { GroupExpenseSplit } from '../entities/group-expense-split.entity';
import { GroupSettlement } from '../entities/group-settlement.entity';
import { GroupInvite } from '../entities/group-invite.entity';
import { User } from '../entities/user.entity';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CurrencyService } from '../currency/currency.service';
import { SplitCalculationService } from './split-calculation.service';
import {
  CreateGroupDto,
  UpdateGroupDto,
  AddGroupExpenseDto,
  CreateSettlementDto,
  AddMembersDto,
  CreateInviteDto,
} from './groups.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class GroupsService implements OnModuleInit {
  constructor(
    @InjectRepository(ExpenseGroup)
    private groupsRepository: Repository<ExpenseGroup>,
    @InjectRepository(GroupMember)
    private membersRepository: Repository<GroupMember>,
    @InjectRepository(GroupExpense)
    private expensesRepository: Repository<GroupExpense>,
    @InjectRepository(GroupExpenseSplit)
    private splitsRepository: Repository<GroupExpenseSplit>,
    @InjectRepository(GroupSettlement)
    private settlementsRepository: Repository<GroupSettlement>,
    @InjectRepository(GroupInvite)
    private invitesRepository: Repository<GroupInvite>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private subscriptionsService: SubscriptionsService,
    private currencyService: CurrencyService,
    private splitCalculationService: SplitCalculationService,
  ) {}

  async onModuleInit() {
    await this.backfillInviteCodes();
  }

  private async backfillInviteCodes(): Promise<void> {
    const groups = await this.groupsRepository
      .createQueryBuilder('group')
      .where('group.inviteCode IS NULL')
      .getMany();

    for (const group of groups) {
      group.inviteCode = await this.generateUniqueInviteCode();
      await this.groupsRepository.save(group);
    }

    if (groups.length > 0) {
      console.log(`Backfilled invite codes for ${groups.length} existing groups`);
    }
  }

  // --- Helpers ---

  private generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private async generateUniqueInviteCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = this.generateInviteCode();
      const existing = await this.groupsRepository.findOne({ where: { inviteCode: code } });
      if (!existing) return code;
    }
    throw new Error('Failed to generate unique invite code');
  }

  private async assertMembership(userId: string, groupId: string): Promise<GroupMember> {
    const membership = await this.membersRepository.findOne({
      where: { groupId, userId },
    });
    if (!membership) {
      throw new ForbiddenException('Not a member of this group');
    }
    return membership;
  }

  private async assertAdmin(userId: string, groupId: string): Promise<GroupMember> {
    const membership = await this.assertMembership(userId, groupId);
    if (membership.role !== 'admin') {
      throw new ForbiddenException('Only group admins can perform this action');
    }
    return membership;
  }

  // --- Group CRUD ---

  async create(userId: string, dto: CreateGroupDto): Promise<ExpenseGroup> {
    const hasPremium = await this.subscriptionsService.hasPremiumAccess(userId);
    if (!hasPremium) {
      throw new ForbiddenException('Premium subscription required for group expenses');
    }

    const inviteCode = await this.generateUniqueInviteCode();

    const group = this.groupsRepository.create({
      name: dto.name,
      description: dto.description || undefined,
      baseCurrency: dto.baseCurrency || 'USD',
      inviteCode,
      createdBy: userId,
    });

    const savedGroup = await this.groupsRepository.save(group) as ExpenseGroup;

    // Add creator as admin member
    const creatorMember = this.membersRepository.create({
      groupId: savedGroup.id,
      userId,
      role: 'admin',
    });
    await this.membersRepository.save(creatorMember);

    // Add additional members if provided
    if (dto.memberIds && dto.memberIds.length > 0) {
      const memberEntities = dto.memberIds
        .filter((id) => id !== userId)
        .map((memberId) =>
          this.membersRepository.create({
            groupId: savedGroup.id,
            userId: memberId,
            role: 'member',
          }),
        );
      if (memberEntities.length > 0) {
        await this.membersRepository.save(memberEntities);
      }
    }

    return this.findOne(userId, savedGroup.id);
  }

  async findAll(userId: string): Promise<ExpenseGroup[]> {
    const memberships = await this.membersRepository.find({
      where: { userId },
      select: ['groupId'],
    });

    if (memberships.length === 0) return [];

    const groupIds = memberships.map((m) => m.groupId);

    return this.groupsRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.creator', 'creator')
      .leftJoinAndSelect('group.members', 'members')
      .leftJoinAndSelect('members.user', 'memberUser')
      .whereInIds(groupIds)
      .orderBy('group.updatedAt', 'DESC')
      .getMany();
  }

  async findOne(userId: string, id: string): Promise<ExpenseGroup> {
    const group = await this.groupsRepository.findOne({
      where: { id },
      relations: ['creator', 'members', 'members.user'],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const isMember = group.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException('Not a member of this group');
    }

    return group;
  }

  async updateGroup(userId: string, id: string, dto: UpdateGroupDto): Promise<ExpenseGroup> {
    await this.assertAdmin(userId, id);

    await this.groupsRepository.update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.baseCurrency !== undefined && { baseCurrency: dto.baseCurrency }),
    });

    return this.findOne(userId, id);
  }

  async deleteGroup(userId: string, id: string): Promise<void> {
    await this.assertAdmin(userId, id);
    await this.groupsRepository.delete(id);
  }

  // --- Members ---

  async getGroupMembers(userId: string, groupId: string): Promise<GroupMember[]> {
    await this.assertMembership(userId, groupId);

    return this.membersRepository.find({
      where: { groupId },
      relations: ['user'],
      order: { joinedAt: 'ASC' },
    });
  }

  async addMembers(userId: string, groupId: string, dto: AddMembersDto): Promise<GroupMember[]> {
    await this.assertMembership(userId, groupId);

    const newMembers: GroupMember[] = [];

    for (const memberId of dto.memberIds) {
      const existing = await this.membersRepository.findOne({
        where: { groupId, userId: memberId },
      });
      if (existing) continue;

      const user = await this.usersRepository.findOne({ where: { id: memberId } });
      if (!user) continue;

      const member = this.membersRepository.create({
        groupId,
        userId: memberId,
        role: 'member',
      });
      newMembers.push(member);
    }

    if (newMembers.length > 0) {
      await this.membersRepository.save(newMembers);
    }

    return this.getGroupMembers(userId, groupId);
  }

  async removeMember(userId: string, groupId: string, targetUserId: string): Promise<void> {
    if (userId !== targetUserId) {
      await this.assertAdmin(userId, groupId);
    } else {
      await this.assertMembership(userId, groupId);
    }

    if (userId === targetUserId) {
      const membership = await this.membersRepository.findOne({
        where: { groupId, userId },
      });
      if (membership?.role === 'admin') {
        const adminCount = await this.membersRepository.count({
          where: { groupId, role: 'admin' },
        });
        if (adminCount <= 1) {
          throw new BadRequestException('Cannot remove the last admin. Transfer admin role first.');
        }
      }
    }

    await this.membersRepository.delete({ groupId, userId: targetUserId });
  }

  async joinByCode(userId: string, inviteCode: string): Promise<ExpenseGroup> {
    const group = await this.groupsRepository.findOne({
      where: { inviteCode: inviteCode.toUpperCase() },
    });

    if (!group) {
      throw new NotFoundException('Invalid invite code');
    }

    const existing = await this.membersRepository.findOne({
      where: { groupId: group.id, userId },
    });
    if (existing) {
      return this.findOne(userId, group.id);
    }

    const member = this.membersRepository.create({
      groupId: group.id,
      userId,
      role: 'member',
    });
    await this.membersRepository.save(member);

    return this.findOne(userId, group.id);
  }

  async searchUsers(query: string): Promise<Array<{ id: string; name: string; email: string }>> {
    if (!query || query.length < 2) return [];

    const users = await this.usersRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.name', 'user.email'])
      .where('user.name LIKE :query', { query: `%${query}%` })
      .orWhere('user.email LIKE :query', { query: `%${query}%` })
      .limit(20)
      .getMany();

    return users.map((u) => ({ id: u.id, name: u.name, email: u.email }));
  }

  // --- Expenses ---

  async addExpense(
    userId: string,
    groupId: string,
    dto: AddGroupExpenseDto,
  ): Promise<GroupExpense> {
    await this.assertMembership(userId, groupId);

    const paidBy = dto.paidBy || userId;
    await this.assertMembership(paidBy, groupId);

    for (const participantId of dto.splitBetween) {
      await this.assertMembership(participantId, groupId);
    }

    let splitAmounts: Map<string, number>;

    switch (dto.splitType) {
      case SplitType.EQUAL:
        splitAmounts = this.splitCalculationService.calculateEqualSplit(
          dto.amount,
          dto.splitBetween,
          paidBy,
        );
        break;

      case SplitType.EXACT:
        if (!dto.splits || dto.splits.length === 0) {
          throw new BadRequestException('Splits required for EXACT split type');
        }
        splitAmounts = new Map(dto.splits.map((s) => [s.userId, s.amount]));
        if (!this.splitCalculationService.validateExactSplit(dto.amount, splitAmounts)) {
          throw new BadRequestException('Split amounts must sum to the total expense amount');
        }
        break;

      case SplitType.PERCENTAGE:
        if (!dto.splits || dto.splits.length === 0) {
          throw new BadRequestException('Splits required for PERCENTAGE split type');
        }
        const percentages = new Map(dto.splits.map((s) => [s.userId, s.amount]));
        splitAmounts = this.splitCalculationService.calculatePercentageSplit(
          dto.amount,
          percentages,
        );
        break;

      default:
        throw new BadRequestException('Invalid split type');
    }

    const expense = this.expensesRepository.create({
      groupId,
      paidBy,
      amount: dto.amount,
      currency: dto.currency,
      description: dto.description,
      date: dto.date as any,
      splitType: dto.splitType,
    });

    const savedExpense = await this.expensesRepository.save(expense) as GroupExpense;

    const splitEntries = Array.from(splitAmounts.entries()).map(([splitUserId, amount]) =>
      this.splitsRepository.create({
        groupExpenseId: savedExpense.id,
        userId: splitUserId,
        amount,
      }),
    );

    await this.splitsRepository.save(splitEntries);

    const result = await this.expensesRepository.findOne({
      where: { id: savedExpense.id },
      relations: ['splits', 'splits.user', 'payer'],
    });

    return result!;
  }

  async getGroupExpenses(userId: string, groupId: string): Promise<GroupExpense[]> {
    await this.assertMembership(userId, groupId);

    return this.expensesRepository.find({
      where: { groupId },
      relations: ['splits', 'splits.user', 'payer'],
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async deleteExpense(userId: string, groupId: string, expenseId: string): Promise<void> {
    await this.assertMembership(userId, groupId);

    const expense = await this.expensesRepository.findOne({
      where: { id: expenseId, groupId },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    await this.expensesRepository.remove(expense);
  }

  // --- Balances & Debts ---

  async getGroupBalances(userId: string, groupId: string) {
    await this.assertMembership(userId, groupId);

    const group = await this.groupsRepository.findOne({
      where: { id: groupId },
      relations: ['members', 'members.user'],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const expenses = await this.expensesRepository.find({
      where: { groupId },
      relations: ['splits'],
    });

    const settlements = await this.settlementsRepository.find({
      where: { groupId },
    });

    const netBalances = new Map<string, number>();

    for (const member of group.members) {
      netBalances.set(member.userId, 0);
    }

    for (const expense of expenses) {
      let amount = Number(expense.amount);

      if (expense.currency !== group.baseCurrency) {
        try {
          amount = await this.currencyService.convert(
            amount,
            expense.currency,
            group.baseCurrency,
          );
        } catch {
          // If conversion fails, use original amount
        }
      }

      const totalOriginal = Number(expense.amount);
      const conversionRatio = totalOriginal > 0 ? amount / totalOriginal : 1;

      const payerBalance = netBalances.get(expense.paidBy) || 0;
      netBalances.set(expense.paidBy, payerBalance + amount);

      for (const split of expense.splits) {
        const splitAmount = Number(split.amount) * conversionRatio;
        const splitUserBalance = netBalances.get(split.userId) || 0;
        netBalances.set(split.userId, splitUserBalance - splitAmount);
      }
    }

    for (const settlement of settlements) {
      let amount = Number(settlement.amount);

      if (settlement.currency !== group.baseCurrency) {
        try {
          amount = await this.currencyService.convert(
            amount,
            settlement.currency,
            group.baseCurrency,
          );
        } catch {
          // Use original amount if conversion fails
        }
      }

      const fromBalance = netBalances.get(settlement.fromUserId) || 0;
      netBalances.set(settlement.fromUserId, fromBalance + amount);

      const toBalance = netBalances.get(settlement.toUserId) || 0;
      netBalances.set(settlement.toUserId, toBalance - amount);
    }

    const userNameMap = new Map<string, string>();
    for (const member of group.members) {
      userNameMap.set(member.userId, member.user?.name || 'Unknown');
    }

    const simplifiedDebts = this.splitCalculationService.simplifyDebts(netBalances);

    const balances = Array.from(netBalances.entries()).map(([uid, balance]) => ({
      userId: uid,
      userName: userNameMap.get(uid) || 'Unknown',
      balance: Math.round(balance * 100) / 100,
    }));

    const debts = simplifiedDebts.map((d) => ({
      fromUserId: d.from,
      fromUserName: userNameMap.get(d.from) || 'Unknown',
      toUserId: d.to,
      toUserName: userNameMap.get(d.to) || 'Unknown',
      amount: d.amount,
      currency: group.baseCurrency,
    }));

    return {
      baseCurrency: group.baseCurrency,
      balances,
      debts,
    };
  }

  // --- Settlements ---

  async createSettlement(
    userId: string,
    groupId: string,
    dto: CreateSettlementDto,
  ): Promise<GroupSettlement> {
    await this.assertMembership(userId, groupId);
    await this.assertMembership(dto.toUserId, groupId);

    const settlement = this.settlementsRepository.create({
      groupId,
      fromUserId: userId,
      toUserId: dto.toUserId,
      amount: dto.amount,
      currency: dto.currency,
      note: dto.note || undefined,
    });

    return this.settlementsRepository.save(settlement) as Promise<GroupSettlement>;
  }

  async getSettlements(userId: string, groupId: string): Promise<GroupSettlement[]> {
    await this.assertMembership(userId, groupId);

    return this.settlementsRepository.find({
      where: { groupId },
      relations: ['fromUser', 'toUser'],
      order: { createdAt: 'DESC' },
    });
  }

  // --- Invites ---

  async createInvite(
    userId: string,
    groupId: string,
    dto: CreateInviteDto,
  ): Promise<GroupInvite> {
    await this.assertMembership(userId, groupId);

    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = this.invitesRepository.create({
      groupId,
      email: dto.email,
      token,
      invitedBy: userId,
      expiresAt,
    });

    return this.invitesRepository.save(invite) as Promise<GroupInvite>;
  }

  async acceptInvite(userId: string, token: string): Promise<ExpenseGroup> {
    const invite = await this.invitesRepository.findOne({
      where: { token },
      relations: ['group'],
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.acceptedAt) {
      throw new ConflictException('Invite already accepted');
    }

    if (new Date() > invite.expiresAt) {
      throw new GoneException('Invite has expired');
    }

    const existing = await this.membersRepository.findOne({
      where: { groupId: invite.groupId, userId },
    });

    if (!existing) {
      const member = this.membersRepository.create({
        groupId: invite.groupId,
        userId,
        role: 'member',
      });
      await this.membersRepository.save(member);
    }

    invite.acceptedAt = new Date();
    await this.invitesRepository.save(invite);

    return this.findOne(userId, invite.groupId);
  }
}
