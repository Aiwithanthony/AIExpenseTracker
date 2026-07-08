import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1783354513883 implements MigrationInterface {
    name = 'InitialSchema1783354513883'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid, "name" character varying NOT NULL, "icon" character varying, "color" character varying, "isDefault" boolean NOT NULL DEFAULT false, "budgetLimit" numeric(18,2), "budgetPeriod" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "expenses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "amount" numeric(18,2) NOT NULL, "currency" character varying NOT NULL, "convertedAmount" numeric(18,2), "convertedCurrency" character varying, "description" character varying NOT NULL, "categoryId" uuid, "merchant" character varying, "date" date NOT NULL, "location" json, "receiptImageUrl" character varying, "source" character varying NOT NULL DEFAULT 'app', "type" character varying NOT NULL DEFAULT 'expense', "tags" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_94c3ceb17e3140abc9282c20610" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "tier" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'active', "currentPeriodStart" TIMESTAMP NOT NULL, "currentPeriodEnd" TIMESTAMP NOT NULL, "cancelAtPeriodEnd" boolean NOT NULL DEFAULT false, "paymentMethod" character varying, "stripeSubscriptionId" character varying, "whishSubscriptionId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_fbdba4e2ac694cf8c9cecf4dc84" UNIQUE ("userId"), CONSTRAINT "REL_fbdba4e2ac694cf8c9cecf4dc8" UNIQUE ("userId"), CONSTRAINT "PK_a87248d73155605cf782be9ee5e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "group_expense_splits" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "groupExpenseId" uuid NOT NULL, "userId" uuid NOT NULL, "amount" numeric(18,2) NOT NULL, CONSTRAINT "UQ_dffd787662aa186db291c271026" UNIQUE ("groupExpenseId", "userId"), CONSTRAINT "PK_d464b43e8aa45d07fc229d22685" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "group_expenses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "groupId" uuid NOT NULL, "paidBy" uuid NOT NULL, "amount" numeric(18,2) NOT NULL, "currency" character varying NOT NULL, "description" character varying NOT NULL, "date" date NOT NULL, "splitType" character varying NOT NULL DEFAULT 'equal', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5f758da134cc01c6a31cf3cd000" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "group_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "groupId" uuid NOT NULL, "userId" uuid NOT NULL, "role" character varying NOT NULL DEFAULT 'member', "joinedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_53f644f66a416c1542b743c0295" UNIQUE ("groupId", "userId"), CONSTRAINT "PK_86446139b2c96bfd0f3b8638852" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "group_settlements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "groupId" uuid NOT NULL, "fromUserId" uuid NOT NULL, "toUserId" uuid NOT NULL, "amount" numeric(18,2) NOT NULL, "currency" character varying NOT NULL, "note" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_bc787ebef855b887c4c2eb3d939" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "expense_groups" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying, "baseCurrency" character varying NOT NULL DEFAULT 'USD', "inviteCode" character varying(8), "createdBy" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_d846bdfbf7474f5af6079ce0d52" UNIQUE ("inviteCode"), CONSTRAINT "PK_777b1df7969a9a0ed6ae4406548" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "name" character varying NOT NULL, "phoneNumber" character varying, "passwordHash" character varying, "subscriptionTier" character varying NOT NULL DEFAULT 'free', "isAdmin" boolean NOT NULL DEFAULT false, "subscriptionExpiresAt" TIMESTAMP, "currency" character varying NOT NULL DEFAULT 'USD', "whatsappNumber" character varying, "telegramChatId" character varying, "telegramLinkCode" character varying, "telegramLinkCodeExpires" TIMESTAMP, "authProvider" character varying, "externalId" character varying, "failedLoginAttempts" integer NOT NULL DEFAULT '0', "lockoutUntil" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "group_invites" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "groupId" uuid NOT NULL, "email" character varying NOT NULL, "token" character varying NOT NULL, "invitedBy" uuid NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "acceptedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_10d879ff6ab405de7a646a53e00" UNIQUE ("token"), CONSTRAINT "PK_ca736add48a2a0f2f7950e4ac9b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "group_expense_comments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "groupExpenseId" uuid NOT NULL, "userId" uuid NOT NULL, "text" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e205427c8e4b7b3586c955a426c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "tokenHash" character varying NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "revokedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_c25bc63d248ca90e8dcc1d92d06" UNIQUE ("tokenHash"), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_610102b60fea1455310ccd299d" ON "refresh_tokens" ("userId") `);
        await queryRunner.query(`CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "amount" numeric(18,2) NOT NULL, "currency" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "paymentMethod" character varying NOT NULL, "stripePaymentId" character varying, "whishPaymentId" character varying, "subscriptionId" character varying, "metadata" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "budgets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "categoryId" uuid, "amount" numeric(18,2) NOT NULL, "currency" character varying NOT NULL, "period" character varying NOT NULL, "startDate" date NOT NULL, "endDate" date NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9c8a51748f82387644b773da482" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "bills" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "name" character varying NOT NULL, "amount" numeric(18,2) NOT NULL, "currency" character varying NOT NULL, "categoryId" uuid, "dueDate" TIMESTAMP NOT NULL, "frequency" character varying NOT NULL, "isPaid" boolean NOT NULL DEFAULT false, "lastPaidDate" TIMESTAMP, "isActive" boolean NOT NULL DEFAULT true, "reminderDaysBefore" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a56215dfcb525755ec832cc80b7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "templates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "name" character varying NOT NULL, "amount" numeric(18,2) NOT NULL, "currency" character varying NOT NULL, "categoryId" uuid, "description" character varying, "merchant" character varying, "type" character varying NOT NULL DEFAULT 'expense', "tags" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_515948649ce0bbbe391de702ae5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "wallets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "name" character varying NOT NULL, "balance" numeric(18,2) NOT NULL, "currency" character varying NOT NULL, "icon" character varying, "color" character varying, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8402e5df5a30a229380e83e4f7e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "challenges" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "name" character varying NOT NULL, "type" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'active', "targetAmount" numeric(18,2), "startDate" date NOT NULL, "endDate" date NOT NULL, "currentProgress" numeric(18,2) NOT NULL DEFAULT '0', "categoryId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1e664e93171e20fe4d6125466af" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "location_rules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "name" character varying NOT NULL DEFAULT '', "locationType" character varying NOT NULL DEFAULT 'custom', "latitude" numeric(10,6) NOT NULL, "longitude" numeric(10,6) NOT NULL, "radius" numeric(10,2) NOT NULL, "minTimeSpent" numeric(10,2) NOT NULL, "enabled" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_af2b39b817c607db4d201f5062c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_92970f7410f3a85b0debf1bd93" ON "location_rules" ("userId") `);
        await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "FK_13e8b2a21988bec6fdcbb1fa741" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "expenses" ADD CONSTRAINT "FK_3d211de716f0f14ea7a8a4b1f2c" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "expenses" ADD CONSTRAINT "FK_ac0801a1760c5f9ce43c03bacd0" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_fbdba4e2ac694cf8c9cecf4dc84" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "group_expense_splits" ADD CONSTRAINT "FK_c680cdbfaaf88d563300dd10191" FOREIGN KEY ("groupExpenseId") REFERENCES "group_expenses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "group_expense_splits" ADD CONSTRAINT "FK_d046c96b3da37c857987ddf5c7b" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "group_expenses" ADD CONSTRAINT "FK_425d21da741602807098a670c87" FOREIGN KEY ("groupId") REFERENCES "expense_groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "group_expenses" ADD CONSTRAINT "FK_80ff8071d9c6d4c2188ba937083" FOREIGN KEY ("paidBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "group_members" ADD CONSTRAINT "FK_1aa8d31831c3126947e7a713c2b" FOREIGN KEY ("groupId") REFERENCES "expense_groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "group_members" ADD CONSTRAINT "FK_fdef099303bcf0ffd9a4a7b18f5" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "group_settlements" ADD CONSTRAINT "FK_3686ba1bbe5a23b1dfcb2b7427e" FOREIGN KEY ("groupId") REFERENCES "expense_groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "group_settlements" ADD CONSTRAINT "FK_0a951c8523a17ba27d2a0c10647" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "group_settlements" ADD CONSTRAINT "FK_120d47ee8b9b6136f18b9ac3ba3" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "expense_groups" ADD CONSTRAINT "FK_046e06b905b3e45a8f0b51a0185" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "group_invites" ADD CONSTRAINT "FK_a19036d19bd85c157b035d78c8a" FOREIGN KEY ("groupId") REFERENCES "expense_groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "group_invites" ADD CONSTRAINT "FK_625abe03f724253af5308a22b71" FOREIGN KEY ("invitedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "group_expense_comments" ADD CONSTRAINT "FK_c0ad46da716dd1c7496f65a8a9d" FOREIGN KEY ("groupExpenseId") REFERENCES "group_expenses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "group_expense_comments" ADD CONSTRAINT "FK_a2e60798ab15b152e7d474403d3" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_610102b60fea1455310ccd299de" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_d35cb3c13a18e1ea1705b2817b1" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "budgets" ADD CONSTRAINT "FK_27e688ddf1ff3893b43065899f9" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "budgets" ADD CONSTRAINT "FK_3ece6e1292b7a86ba82145775a7" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bills" ADD CONSTRAINT "FK_dd941796f5112bc83a7bf499f86" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bills" ADD CONSTRAINT "FK_467bc46addf91881ec707f84601" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "templates" ADD CONSTRAINT "FK_7193babbf16087eb6107606dfe3" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "templates" ADD CONSTRAINT "FK_d591d05a2b7699e76589f4fca41" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wallets" ADD CONSTRAINT "FK_2ecdb33f23e9a6fc392025c0b97" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "challenges" ADD CONSTRAINT "FK_71457d92a08a52ceaa85edb01c4" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "challenges" DROP CONSTRAINT "FK_71457d92a08a52ceaa85edb01c4"`);
        await queryRunner.query(`ALTER TABLE "wallets" DROP CONSTRAINT "FK_2ecdb33f23e9a6fc392025c0b97"`);
        await queryRunner.query(`ALTER TABLE "templates" DROP CONSTRAINT "FK_d591d05a2b7699e76589f4fca41"`);
        await queryRunner.query(`ALTER TABLE "templates" DROP CONSTRAINT "FK_7193babbf16087eb6107606dfe3"`);
        await queryRunner.query(`ALTER TABLE "bills" DROP CONSTRAINT "FK_467bc46addf91881ec707f84601"`);
        await queryRunner.query(`ALTER TABLE "bills" DROP CONSTRAINT "FK_dd941796f5112bc83a7bf499f86"`);
        await queryRunner.query(`ALTER TABLE "budgets" DROP CONSTRAINT "FK_3ece6e1292b7a86ba82145775a7"`);
        await queryRunner.query(`ALTER TABLE "budgets" DROP CONSTRAINT "FK_27e688ddf1ff3893b43065899f9"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_d35cb3c13a18e1ea1705b2817b1"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_610102b60fea1455310ccd299de"`);
        await queryRunner.query(`ALTER TABLE "group_expense_comments" DROP CONSTRAINT "FK_a2e60798ab15b152e7d474403d3"`);
        await queryRunner.query(`ALTER TABLE "group_expense_comments" DROP CONSTRAINT "FK_c0ad46da716dd1c7496f65a8a9d"`);
        await queryRunner.query(`ALTER TABLE "group_invites" DROP CONSTRAINT "FK_625abe03f724253af5308a22b71"`);
        await queryRunner.query(`ALTER TABLE "group_invites" DROP CONSTRAINT "FK_a19036d19bd85c157b035d78c8a"`);
        await queryRunner.query(`ALTER TABLE "expense_groups" DROP CONSTRAINT "FK_046e06b905b3e45a8f0b51a0185"`);
        await queryRunner.query(`ALTER TABLE "group_settlements" DROP CONSTRAINT "FK_120d47ee8b9b6136f18b9ac3ba3"`);
        await queryRunner.query(`ALTER TABLE "group_settlements" DROP CONSTRAINT "FK_0a951c8523a17ba27d2a0c10647"`);
        await queryRunner.query(`ALTER TABLE "group_settlements" DROP CONSTRAINT "FK_3686ba1bbe5a23b1dfcb2b7427e"`);
        await queryRunner.query(`ALTER TABLE "group_members" DROP CONSTRAINT "FK_fdef099303bcf0ffd9a4a7b18f5"`);
        await queryRunner.query(`ALTER TABLE "group_members" DROP CONSTRAINT "FK_1aa8d31831c3126947e7a713c2b"`);
        await queryRunner.query(`ALTER TABLE "group_expenses" DROP CONSTRAINT "FK_80ff8071d9c6d4c2188ba937083"`);
        await queryRunner.query(`ALTER TABLE "group_expenses" DROP CONSTRAINT "FK_425d21da741602807098a670c87"`);
        await queryRunner.query(`ALTER TABLE "group_expense_splits" DROP CONSTRAINT "FK_d046c96b3da37c857987ddf5c7b"`);
        await queryRunner.query(`ALTER TABLE "group_expense_splits" DROP CONSTRAINT "FK_c680cdbfaaf88d563300dd10191"`);
        await queryRunner.query(`ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_fbdba4e2ac694cf8c9cecf4dc84"`);
        await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "FK_ac0801a1760c5f9ce43c03bacd0"`);
        await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "FK_3d211de716f0f14ea7a8a4b1f2c"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_13e8b2a21988bec6fdcbb1fa741"`);
        await queryRunner.query(`DROP INDEX "IDX_92970f7410f3a85b0debf1bd93"`);
        await queryRunner.query(`DROP TABLE "location_rules"`);
        await queryRunner.query(`DROP TABLE "challenges"`);
        await queryRunner.query(`DROP TABLE "wallets"`);
        await queryRunner.query(`DROP TABLE "templates"`);
        await queryRunner.query(`DROP TABLE "bills"`);
        await queryRunner.query(`DROP TABLE "budgets"`);
        await queryRunner.query(`DROP TABLE "payments"`);
        await queryRunner.query(`DROP INDEX "IDX_610102b60fea1455310ccd299d"`);
        await queryRunner.query(`DROP TABLE "refresh_tokens"`);
        await queryRunner.query(`DROP TABLE "group_expense_comments"`);
        await queryRunner.query(`DROP TABLE "group_invites"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "expense_groups"`);
        await queryRunner.query(`DROP TABLE "group_settlements"`);
        await queryRunner.query(`DROP TABLE "group_members"`);
        await queryRunner.query(`DROP TABLE "group_expenses"`);
        await queryRunner.query(`DROP TABLE "group_expense_splits"`);
        await queryRunner.query(`DROP TABLE "subscriptions"`);
        await queryRunner.query(`DROP TABLE "expenses"`);
        await queryRunner.query(`DROP TABLE "categories"`);
    }

}
