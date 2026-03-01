// Shared types across mobile app, backend, and admin dashboard

export interface User {
  id: string;
  email: string;
  name: string;
  phoneNumber?: string;
  createdAt: Date;
  subscriptionTier: SubscriptionTier;
  subscriptionExpiresAt?: Date;
  currency: string; // Default currency (e.g., 'USD', 'LBP')
}

export enum SubscriptionTier {
  FREE = 'free',
  PREMIUM = 'premium',
}

export interface Expense {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  convertedAmount?: number; // Amount in user's default currency
  convertedCurrency?: string;
  description: string;
  category: string;
  merchant?: string;
  date: Date;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  receiptImageUrl?: string;
  source: ExpenseSource; // How the expense was logged
  createdAt: Date;
  updatedAt: Date;
}

export enum ExpenseSource {
  APP = 'app',
  VOICE_APP = 'voice_app',
  WHATSAPP = 'whatsapp',
  TELEGRAM = 'telegram',
  RECEIPT_SCAN = 'receipt_scan',
}

export interface Category {
  id: string;
  userId?: string; // null for default categories
  name: string;
  icon?: string;
  color?: string;
  isDefault: boolean;
}

export interface ParsedExpense {
  amount: number;
  currency?: string;
  description: string;
  merchant?: string;
  date?: Date;
  category?: string;
}

export interface ReceiptData {
  merchant: string;
  amount: number;
  currency: string;
  date: Date;
  items?: Array<{
    name: string;
    price: number;
  }>;
}

// --- Group Expense Splitting Types ---

export enum SplitType {
  EQUAL = 'equal',
  EXACT = 'exact',
  PERCENTAGE = 'percentage',
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: string; // 'admin' | 'member'
  joinedAt: Date;
  user?: User;
}

export interface ExpenseGroup {
  id: string;
  name: string;
  description?: string;
  baseCurrency: string;
  inviteCode: string;
  createdBy: string;
  members: GroupMember[];
  createdAt: Date;
  updatedAt: Date;
  creator?: User;
}

export interface GroupExpense {
  id: string;
  groupId: string;
  paidBy: string;
  amount: number;
  currency: string;
  description: string;
  date: Date;
  splitType: SplitType;
  splits: GroupExpenseSplit[];
  payer?: User;
  createdAt: Date;
}

export interface GroupExpenseSplit {
  id: string;
  groupExpenseId: string;
  userId: string;
  amount: number;
  user?: User;
}

export interface GroupSettlement {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: string;
  note?: string;
  createdAt: Date;
  fromUser?: User;
  toUser?: User;
}

export interface GroupInvite {
  id: string;
  groupId: string;
  email: string;
  token: string;
  invitedBy: string;
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
}

export interface SimplifiedDebt {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
  currency: string;
}

export interface GroupBalance {
  userId: string;
  userName: string;
  balance: number; // positive = owed by group, negative = owes group
}

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  paymentMethod?: string; // 'stripe', 'whish', etc.
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  PAST_DUE = 'past_due',
  TRIALING = 'trialing',
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface ExpenseStats {
  total: number;
  byCategory: Record<string, number>;
  byDate: Record<string, number>;
  averagePerDay: number;
}

export interface LocationRule {
  id: string;
  locationType: string;
  latitude: number;
  longitude: number;
  radius: number;
  minTimeSpent: number;
  name?: string;
  isActive: boolean;
}
