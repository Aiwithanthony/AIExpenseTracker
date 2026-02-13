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

export interface GroupExpense {
  id: string;
  groupId: string;
  expenseId: string;
  userId: string;
  amount: number;
  currency: string;
  description: string;
  date: Date;
}

export interface ExpenseGroup {
  id: string;
  name: string;
  createdBy: string;
  members: string[]; // User IDs
  createdAt: Date;
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

