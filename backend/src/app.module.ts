import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LLMModule } from './llm/llm.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ExpensesModule } from './expenses/expenses.module';
import { CategoriesModule } from './categories/categories.module';
import { CurrencyModule } from './currency/currency.module';
import { VoiceModule } from './voice/voice.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { TelegramModule } from './telegram/telegram.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PaymentsModule } from './payments/payments.module';
import { GroupsModule } from './groups/groups.module';
import { GeolocationModule } from './geolocation/geolocation.module';
import { AdminModule } from './admin/admin.module';
import { ChatModule } from './chat/chat.module';
import { BudgetsModule } from './budgets/budgets.module';
import { BillsModule } from './bills/bills.module';
import { TemplatesModule } from './templates/templates.module';
import { WalletsModule } from './wallets/wallets.module';
import { ChallengesModule } from './challenges/challenges.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute globally (reasonable for mobile app)
      },
    ]),
    DatabaseModule,
    LLMModule,
    AuthModule,
    ExpensesModule,
    CategoriesModule,
    CurrencyModule,
    VoiceModule,
    ReceiptsModule,
    TelegramModule,
    WhatsAppModule,
    SubscriptionsModule,
    PaymentsModule,
    GroupsModule,
    GeolocationModule,
    AdminModule,
    ChatModule,
    BudgetsModule,
    BillsModule,
    TemplatesModule,
    WalletsModule,
    ChallengesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SecurityHeadersMiddleware).forRoutes('*');
  }
}
