import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Expense } from '../entities/expense.entity';
import { Subscription } from '../entities/subscription.entity';
import { Payment } from '../entities/payment.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard) // TODO: Add admin role guard
export class AdminController {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Expense)
    private expensesRepository: Repository<Expense>,
    @InjectRepository(Subscription)
    private subscriptionsRepository: Repository<Subscription>,
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
  ) {}

  @Get('stats')
  async getStats() {
    const [
      totalUsers,
      activeSubscriptions,
      totalRevenue,
      totalExpenses,
    ] = await Promise.all([
      this.usersRepository.count(),
      this.subscriptionsRepository.count({
        where: { status: 'active' as any },
      }),
      this.paymentsRepository
        .createQueryBuilder('payment')
        .select('SUM(payment.amount)', 'total')
        .where('payment.status = :status', { status: 'completed' })
        .getRawOne(),
      this.expensesRepository.count(),
    ]);

    return {
      totalUsers,
      activeSubscribers: activeSubscriptions,
      totalRevenue: parseFloat(totalRevenue?.total || '0'),
      expensesLogged: totalExpenses,
    };
  }

  @Get('users')
  async getUsers() {
    const users = await this.usersRepository.find({
      select: ['id', 'email', 'name', 'subscriptionTier', 'createdAt'],
      order: { createdAt: 'DESC' },
      take: 100,
    });

    return {
      users,
      total: users.length,
    };
  }

  @Get('subscribers')
  async getSubscribers() {
    const subscriptions = await this.subscriptionsRepository.find({
      where: { status: 'active' as any },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return {
      subscribers: subscriptions.map((sub) => ({
        id: sub.id,
        userId: sub.userId,
        userEmail: sub.user?.email,
        tier: sub.tier,
        status: sub.status,
        currentPeriodEnd: sub.currentPeriodEnd,
        createdAt: sub.createdAt,
      })),
      total: subscriptions.length,
    };
  }

  @Get('payments')
  async getPayments() {
    const payments = await this.paymentsRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: 100,
    });

    return {
      payments: payments.map((payment) => ({
        id: payment.id,
        userId: payment.userId,
        userEmail: payment.user?.email,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        createdAt: payment.createdAt,
      })),
      total: payments.length,
    };
  }
}

