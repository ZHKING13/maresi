import { z } from 'zod';
import {
  PaymentStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentCurrency,
} from '@prisma/client';

// Validation des enums
export const PaymentStatusSchema = z.enum(PaymentStatus);
export const PaymentMethodSchema = z.enum(PaymentMethod);
export const PaymentProviderSchema = z.enum(PaymentProvider);
export const PaymentCurrencySchema = z.enum(PaymentCurrency);

// ========== SCHÉMAS DE CRÉATION ==========

export const createPaymentSchema = z.object({
  amount: z
    .number()
    .positive('Le montant doit être positif')
    .max(10000000, 'Le montant ne peut pas dépasser 10,000,000')
    .transform((val) => Math.round(val * 100) / 100), // Arrondi à 2 décimales

  currency: PaymentCurrencySchema.optional().default(PaymentCurrency.XOF),

  description: z
    .string()
    .min(3, 'La description doit contenir au moins 3 caractères')
    .max(255, 'La description ne peut pas dépasser 255 caractères')
    .optional(),

  paymentMethod: PaymentMethodSchema,

  provider: PaymentProviderSchema.optional(),

  customerName: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .optional(),

  customerEmail: z.string().email("Format d'email invalide").optional(),

  customerPhone: z
    .string()
    .regex(
      /^\+?[1-9]\d{1,14}$/,
      'Format de téléphone invalide (ex: +225xxxxxxxx)',
    )
    .optional(),

  returnUrl: z.string().url('URL de retour invalide').optional(),

  channels: z.string().optional(),

  metadata: z.record(z.string(), z.any()).optional(),
});

// ========== SCHÉMAS DE REQUÊTE ==========

export const paymentQuerySchema = z
  .object({
    status: PaymentStatusSchema.optional(),
    paymentMethod: PaymentMethodSchema.optional(),
    provider: PaymentProviderSchema.optional(),
    userId: z.coerce.number().int().positive().optional(),

    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),

    limit: z.coerce
      .number()
      .int()
      .min(1, 'La limite doit être au moins de 1')
      .max(100, 'La limite ne peut pas dépasser 100')
      .optional()
      .default(20),

    offset: z.coerce
      .number()
      .int()
      .min(0, "L'offset ne peut pas être négatif")
      .optional()
      .default(0),

    sortBy: z
      .enum(['created', 'amount', 'status'])
      .optional()
      .default('created'),

    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
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
  );

// ========== SCHÉMAS DE REMBOURSEMENT ==========

export const refundPaymentSchema = z.object({
  reason: z
    .string()
    .min(10, 'La raison doit contenir au moins 10 caractères')
    .max(500, 'La raison ne peut pas dépasser 500 caractères'),

  amount: z
    .number()
    .positive('Le montant du remboursement doit être positif')
    .optional(),

  metadata: z.record(z.string(), z.any()).optional(),
});

// ========== SCHÉMAS WEBHOOK ==========

export const webhookPayloadSchema = z.object({
  eventType: z.string().min(1, "Le type d'événement est requis"),

  rawPayload: z.record(z.string(), z.any()),

  signature: z.string().optional(),
});

// Validation spécifique CinetPay pour les webhooks
export const cinetPayWebhookSchema = z.object({
  cpm_trans_id: z.string(),
  cpm_site_id: z.string(),
  signature: z.string(),
  cpm_amount: z.string(),
  cpm_trans_status: z.enum(['ACCEPTED', 'REFUSED', 'CANCELLED']),
  cpm_designation: z.string(),
  buyer_name: z.string(),
  cpm_phone_prefixe: z.string().optional(),
  cpm_language: z.string().optional(),
  cpm_version: z.string().optional(),
  cpm_payment_config: z.string().optional(),
  cpm_page_action: z.string().optional(),
  cpm_custom: z.string().optional(),
  cpm_currency: z.string().optional(),
  cpm_payid: z.string().optional(),
  cpm_payment_date: z.string().optional(),
  cpm_payment_time: z.string().optional(),
  cpm_error_message: z.string().optional(),
});

// ========== SCHÉMAS DE CONFIGURATION ==========

export const cinetPayConfigSchema = z.object({
  apiKey: z.string().min(1, 'La clé API CinetPay est requise'),
  siteId: z.string().min(1, "L'ID du site CinetPay est requis"),
  secretKey: z.string().min(1, 'La clé secrète CinetPay est requise'),
  baseUrl: z
    .string()
    .url('URL de base CinetPay invalide')
    .default('https://api-checkout.cinetpay.com'),
  version: z.string().default('v2'),
});

// ========== SCHÉMAS DE STATISTIQUES ==========

export const paymentStatsQuerySchema = z
  .object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    groupBy: z.enum(['day', 'week', 'month']).optional().default('day'),
    paymentMethod: PaymentMethodSchema.optional(),
    provider: PaymentProviderSchema.optional(),
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
  );

// ========== SCHÉMAS DE VALIDATION DES CANAUX ==========

export const mobileMoneyChannelsSchema = z.object({
  orangeMoney: z.boolean().optional().default(true),
  mtnMoney: z.boolean().optional().default(true),
  moovMoney: z.boolean().optional().default(true),
});

export const cardChannelsSchema = z.object({
  visa: z.boolean().optional().default(true),
  mastercard: z.boolean().optional().default(true),
});

// ========== VALIDATION DE MONTANT PAR PROVIDER ==========

export const validateAmountByProvider = (
  provider: PaymentProvider,
  amount: number,
): boolean => {
  const limits = {
    [PaymentProvider.ORANGE_MONEY]: { min: 100, max: 1500000 }, // 100 FCFA - 1,500,000 FCFA
    [PaymentProvider.MTN_MONEY]: { min: 100, max: 2000000 }, // 100 FCFA - 2,000,000 FCFA
    [PaymentProvider.MOOV_MONEY]: { min: 100, max: 1000000 }, // 100 FCFA - 1,000,000 FCFA
    [PaymentProvider.VISA]: { min: 500, max: 10000000 }, // 500 FCFA - 10,000,000 FCFA
    [PaymentProvider.MASTERCARD]: { min: 500, max: 10000000 }, // 500 FCFA - 10,000,000 FCFA
  };

  const limit = limits[provider];
  return limit ? amount >= limit.min && amount <= limit.max : true;
};
