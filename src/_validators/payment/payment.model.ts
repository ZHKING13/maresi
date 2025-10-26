import {
  PaymentStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentCurrency,
} from '@prisma/client';

// ========== ENUMS ET TYPES ==========

export { PaymentStatus, PaymentMethod, PaymentProvider, PaymentCurrency };

// Types spécifiques CinetPay
export interface ICinetPayConfig {
  apiKey: string;
  siteId: string;
  secretKey: string;
  baseUrl: string;
  version: string;
}

export interface ICinetPayResponse {
  code: string;
  message: string;
  description: string;
  data?: {
    payment_token?: string;
    payment_url?: string;
  };
}

export interface ICinetPayTransactionStatus {
  cpm_trans_id: string;
  cpm_site_id: string;
  signature: string;
  cpm_amount: string;
  cpm_trans_status: 'ACCEPTED' | 'REFUSED' | 'CANCELLED';
  cpm_designation: string;
  buyer_name: string;
}

// ========== INTERFACES PRINCIPALES ==========

export interface IPayment {
  id: number;
  transactionId: string;
  cinetPayTransactionId?: string;
  amount: number;
  currency: PaymentCurrency;
  description?: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  provider?: PaymentProvider;
  userId?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  notifyUrl?: string;
  returnUrl?: string;
  channels?: string;
  cinetPayData?: Record<string, any>;
  paymentUrl?: string;
  metadata?: Record<string, any>;
  failureReason?: string;
  initiatedAt: Date;
  paidAt?: Date;
  failedAt?: Date;
  expiredAt?: Date;
  created: Date;
  updated: Date;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    email?: string;
    phoneNumber?: string;
  };
}

export interface IPaymentWebhook {
  id: number;
  paymentId?: number;
  cinetPayTransactionId?: string;
  eventType: string;
  rawPayload: Record<string, any>;
  processed: boolean;
  ipAddress?: string;
  userAgent?: string;
  signature?: string;
  receivedAt: Date;
  processedAt?: Date;
  created: Date;
  updated: Date;
}

// ========== DTOS ==========

export interface ICreatePaymentDto {
  amount: number;
  currency?: PaymentCurrency;
  description?: string;
  paymentMethod: PaymentMethod;
  provider?: PaymentProvider;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  returnUrl?: string;
  channels?: string;
  metadata?: Record<string, any>;
}

export interface IPaymentQueryDto {
  status?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  provider?: PaymentProvider;
  userId?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'created' | 'amount' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface IPaymentStatsDto {
  totalAmount: number;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  successRate: number;
  averageAmount: number;
  revenueByMethod: {
    [key in PaymentMethod]: number;
  };
  revenueByProvider: {
    [key in PaymentProvider]: number;
  };
  dailyStats?: {
    date: string;
    amount: number;
    transactions: number;
  }[];
}

export interface IRefundPaymentDto {
  reason: string;
  amount?: number; // Remboursement partiel si spécifié
  metadata?: Record<string, any>;
}

export interface IWebhookPayloadDto {
  eventType: string;
  rawPayload: Record<string, any>;
  signature?: string;
}

// ========== RÉPONSES API ==========

export interface IPaymentResponse {
  payment: IPayment;
  paymentUrl?: string;
  message?: string;
}

export interface IPaymentListResponse {
  payments: IPayment[];
  total: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface IPaymentStatusResponse {
  transactionId: string;
  status: PaymentStatus;
  amount: number;
  currency: PaymentCurrency;
  paidAt?: Date;
  failureReason?: string;
  cinetPayData?: Record<string, any>;
}
