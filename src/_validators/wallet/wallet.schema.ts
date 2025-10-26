import { z } from 'zod';
import {
  WalletTransactionType,
  WalletTransactionStatus,
  PaymentCurrency,
} from '@prisma/client';

// ========== ENUMS VALIDATION ==========

export const WalletTransactionTypeSchema = z.enum(WalletTransactionType);
export const WalletTransactionStatusSchema = z.enum(WalletTransactionStatus);
export const PaymentCurrencySchema = z.enum(PaymentCurrency);

// ========== VALIDATION SCHEMAS DE BASE ==========

export const WalletBaseSchema = z.object({
  balance: z.number().min(0, 'Le solde ne peut pas être négatif'),
  currency: PaymentCurrencySchema.default(PaymentCurrency.XOF),
  isActive: z.boolean().default(true),
  isBlocked: z.boolean().default(false),
  blockReason: z.string().optional(),
  dailyLimit: z.number().positive().optional(),
  monthlyLimit: z.number().positive().optional(),
  maxBalance: z.number().positive().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const WalletTransactionBaseSchema = z.object({
  transactionId: z.string().min(1, 'ID transaction requis'),
  referenceId: z.string().optional(),
  type: WalletTransactionTypeSchema,
  amount: z.number().positive('Le montant doit être positif'),
  currency: PaymentCurrencySchema.default(PaymentCurrency.XOF),
  status: WalletTransactionStatusSchema.default(
    WalletTransactionStatus.PENDING,
  ),
  description: z.string().max(500, 'Description trop longue').optional(),
  category: z.string().max(100, 'Catégorie trop longue').optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  sourceType: z.string().max(50, 'Type source trop long').optional(),
  sourceId: z.string().max(100, 'ID source trop long').optional(),
  failureReason: z.string().max(500, 'Raison échec trop longue').optional(),
});

// ========== DTOS DE REQUÊTE ==========

export const RechargeWalletSchema = z.object({
  amount: z
    .number()
    .positive('Le montant doit être positif')
    .min(100, 'Montant minimum: 100 XOF')
    .max(1000000, 'Montant maximum: 1 000 000 XOF'),
  currency: PaymentCurrencySchema.default(PaymentCurrency.XOF),
  description: z
    .string()
    .max(200, 'Description trop longue')
    .optional()
    .transform((val) => val?.trim()),
  paymentMethod: z.enum(['MOBILE_MONEY', 'CREDIT_CARD'], {
    message: 'Méthode de paiement invalide (MOBILE_MONEY ou CREDIT_CARD)',
  }),
  provider: z
    .string()
    .min(1, 'Fournisseur requis')
    .max(50, 'Nom fournisseur trop long')
    .optional(),
  returnUrl: z.string().url('URL de retour invalide').optional(),
});

export const TransferWalletSchema = z.object({
  recipientUserId: z
    .number()
    .int('ID utilisateur invalide')
    .positive('ID utilisateur doit être positif'),
  amount: z
    .number()
    .positive('Le montant doit être positif')
    .min(100, 'Montant minimum: 100 XOF')
    .max(500000, 'Montant maximum: 500 000 XOF'),
  description: z
    .string()
    .max(200, 'Description trop longue')
    .optional()
    .transform((val) => val?.trim()),
  currency: PaymentCurrencySchema.default(PaymentCurrency.XOF),
});

export const DebitWalletSchema = z.object({
  amount: z
    .number()
    .positive('Le montant doit être positif')
    .min(1, 'Montant minimum: 1 XOF'),
  description: z
    .string()
    .max(200, 'Description trop longue')
    .optional()
    .transform((val) => val?.trim()),
  category: z
    .string()
    .max(100, 'Catégorie trop longue')
    .optional()
    .transform((val) => val?.trim()),
  referenceId: z
    .string()
    .max(100, 'ID référence trop long')
    .optional()
    .transform((val) => val?.trim()),
  sourceType: z
    .string()
    .max(50, 'Type source trop long')
    .optional()
    .transform((val) => val?.trim()),
  sourceId: z
    .string()
    .max(100, 'ID source trop long')
    .optional()
    .transform((val) => val?.trim()),
});

export const CreditWalletSchema = z.object({
  amount: z
    .number()
    .positive('Le montant doit être positif')
    .min(1, 'Montant minimum: 1 XOF'),
  description: z
    .string()
    .max(200, 'Description trop longue')
    .optional()
    .transform((val) => val?.trim()),
  category: z
    .string()
    .max(100, 'Catégorie trop longue')
    .optional()
    .transform((val) => val?.trim()),
  referenceId: z
    .string()
    .max(100, 'ID référence trop long')
    .optional()
    .transform((val) => val?.trim()),
  sourceType: z
    .string()
    .max(50, 'Type source trop long')
    .optional()
    .transform((val) => val?.trim()),
  sourceId: z
    .string()
    .max(100, 'ID source trop long')
    .optional()
    .transform((val) => val?.trim()),
});

export const WalletTransactionQuerySchema = z
  .object({
    type: WalletTransactionTypeSchema.optional(),
    status: WalletTransactionStatusSchema.optional(),
    category: z
      .string()
      .max(100, 'Catégorie trop longue')
      .optional()
      .transform((val) => val?.trim()),
    sourceType: z
      .string()
      .max(50, 'Type source trop long')
      .optional()
      .transform((val) => val?.trim()),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    minAmount: z.number().min(0, 'Montant minimum invalide').optional(),
    maxAmount: z.number().positive('Montant maximum invalide').optional(),
    limit: z
      .number()
      .int('Limite doit être un entier')
      .min(1, 'Limite minimum: 1')
      .max(100, 'Limite maximum: 100')
      .default(20),
    offset: z
      .number()
      .int('Offset doit être un entier')
      .min(0, 'Offset minimum: 0')
      .default(0),
    sortBy: z
      .enum(['created', 'amount', 'status'], {
        message: 'Tri invalide (created, amount, status)',
      })
      .default('created'),
    sortOrder: z
      .enum(['asc', 'desc'], {
        message: 'Ordre de tri invalide (asc, desc)',
      })
      .default('desc'),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.startDate <= data.endDate;
      }
      return true;
    },
    {
      message: 'La date de début doit être antérieure à la date de fin',
      path: ['startDate'],
    },
  )
  .refine(
    (data) => {
      if (data.minAmount && data.maxAmount) {
        return data.minAmount <= data.maxAmount;
      }
      return true;
    },
    {
      message: 'Le montant minimum doit être inférieur au montant maximum',
      path: ['minAmount'],
    },
  );

export const UpdateWalletSettingsSchema = z
  .object({
    dailyLimit: z
      .number()
      .positive('Limite journalière doit être positive')
      .max(10000000, 'Limite journalière trop élevée')
      .optional(),
    monthlyLimit: z
      .number()
      .positive('Limite mensuelle doit être positive')
      .max(100000000, 'Limite mensuelle trop élevée')
      .optional(),
    maxBalance: z
      .number()
      .positive('Solde maximum doit être positif')
      .max(1000000000, 'Solde maximum trop élevé')
      .optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.dailyLimit && data.monthlyLimit) {
        return data.dailyLimit <= data.monthlyLimit;
      }
      return true;
    },
    {
      message:
        'La limite journalière doit être inférieure à la limite mensuelle',
      path: ['dailyLimit'],
    },
  );

// ========== SCHEMAS DE PARAMÈTRES D'URL ==========

export const WalletParamsSchema = z.object({
  id: z.coerce
    .number()
    .int('ID wallet invalide')
    .positive('ID wallet doit être positif'),
});

export const TransactionParamsSchema = z.object({
  id: z.coerce
    .number()
    .int('ID transaction invalide')
    .positive('ID transaction doit être positif'),
});

export const UserWalletParamsSchema = z.object({
  userId: z.coerce
    .number()
    .int('ID utilisateur invalide')
    .positive('ID utilisateur doit être positif'),
});

// ========== VALIDATION DES MONTANTS ET LIMITES ==========

export const validateWalletAmount = (
  amount: number,
  balance: number,
  operation: 'debit' | 'credit',
) => {
  if (operation === 'debit' && amount > balance) {
    throw new Error('Solde insuffisant pour cette opération');
  }

  if (amount <= 0) {
    throw new Error('Le montant doit être positif');
  }

  return true;
};

export const validateWalletLimits = (
  amount: number,
  currentBalance: number,
  dailySpent: number,
  monthlySpent: number,
  limits: {
    dailyLimit?: number;
    monthlyLimit?: number;
    maxBalance?: number;
  },
) => {
  const errors: string[] = [];

  if (limits.dailyLimit && dailySpent + amount > limits.dailyLimit) {
    errors.push(`Limite journalière dépassée (${limits.dailyLimit} XOF)`);
  }

  if (limits.monthlyLimit && monthlySpent + amount > limits.monthlyLimit) {
    errors.push(`Limite mensuelle dépassée (${limits.monthlyLimit} XOF)`);
  }

  if (limits.maxBalance && currentBalance + amount > limits.maxBalance) {
    errors.push(`Solde maximum dépassé (${limits.maxBalance} XOF)`);
  }

  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }

  return true;
};
