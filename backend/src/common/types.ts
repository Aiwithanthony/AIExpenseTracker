// Shared types for backend use

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

export enum SubscriptionTier {
  FREE = 'free',
  PREMIUM = 'premium',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  PAST_DUE = 'past_due',
  TRIALING = 'trialing',
}

export enum ExpenseSource {
  APP = 'app',
  VOICE_APP = 'voice_app',
  WHATSAPP = 'whatsapp',
  TELEGRAM = 'telegram',
  RECEIPT_SCAN = 'receipt_scan',
}

