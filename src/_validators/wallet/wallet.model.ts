import {
  WalletTransactionType,
  WalletTransactionStatus,
  PaymentCurrency,
} from '@prisma/client';

// ========== ENUMS ET TYPES ==========

export { WalletTransactionType, WalletTransactionStatus, PaymentCurrency };

// ========== INTERFACES PRINCIPALES ==========

export interface IWallet {
  id: number;
  userId: number;
  balance: number;
  currency: PaymentCurrency;
  isActive: boolean;
  isBlocked: boolean;
  blockReason?: string;
  dailyLimit?: number;
  monthlyLimit?: number;
  maxBalance?: number;
  metadata?: Record<string, any>;
  created: Date;
  updated: Date;
  lastTransactionAt?: Date;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    email?: string;
    phoneNumber?: string;
  };
}

export interface IWalletTransaction {
  id: number;
  transactionId: string;
  referenceId?: string;
  walletId: number;
  userId: number;
  type: WalletTransactionType;
  amount: number;
  currency: PaymentCurrency;
  balanceBefore: number;
  balanceAfter: number;
  status: WalletTransactionStatus;
  description?: string;
  category?: string;
  metadata?: Record<string, any>;
  sourceType?: string;
  sourceId?: string;
  processedBy?: number;
  processedAt?: Date;
  failureReason?: string;
  created: Date;
  updated: Date;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  wallet?: IWallet;
}

// ========== DTOS ==========

export interface IRechargeWalletDto {
  amount: number;
  currency?: PaymentCurrency;
  description?: string;
  paymentMethod: string; // "MOBILE_MONEY" | "CREDIT_CARD"
  provider?: string;
  returnUrl?: string;
}

export interface ITransferWalletDto {
  recipientUserId: number;
  amount: number;
  description?: string;
  currency?: PaymentCurrency;
}

export interface IDebitWalletDto {
  amount: number;
  description?: string;
  category?: string;
  referenceId?: string;
  sourceType?: string;
  sourceId?: string;
}

export interface ICreditWalletDto {
  amount: number;
  description?: string;
  category?: string;
  referenceId?: string;
  sourceType?: string;
  sourceId?: string;
}

export interface IWalletTransactionQueryDto {
  type?: WalletTransactionType;
  status?: WalletTransactionStatus;
  category?: string;
  sourceType?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
  offset?: number;
  sortBy?: 'created' | 'amount' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface IWalletStatsDto {
  totalBalance: number;
  currency: PaymentCurrency;
  totalTransactions: number;
  totalCredits: number;
  totalDebits: number;
  pendingTransactions: number;
  lastTransactionDate?: Date;
  monthlyStats: {
    totalCredits: number;
    totalDebits: number;
    transactionCount: number;
  };
  categoryBreakdown: {
    [category: string]: {
      amount: number;
      count: number;
    };
  };
}

export interface IUpdateWalletSettingsDto {
  dailyLimit?: number;
  monthlyLimit?: number;
  maxBalance?: number;
  isActive?: boolean;
}

// ========== RÉPONSES API ==========

export interface IWalletResponse {
  wallet: IWallet;
  message?: string;
}

export interface IWalletTransactionResponse {
  transaction: IWalletTransaction;
  wallet: IWallet;
  message?: string;
}

export interface IWalletTransactionListResponse {
  transactions: IWalletTransaction[];
  total: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface IWalletRechargeResponse {
  transaction: IWalletTransaction;
  paymentUrl?: string;
  paymentId?: string;
  message: string;
}

export interface IWalletBalanceResponse {
  balance: number;
  currency: PaymentCurrency;
  isActive: boolean;
  isBlocked: boolean;
  dailyLimit?: number;
  monthlyLimit?: number;
  remainingDailyLimit?: number;
  remainingMonthlyLimit?: number;
}
