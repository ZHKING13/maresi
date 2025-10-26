import { z } from 'zod';
import {
  RechargeWalletSchema,
  TransferWalletSchema,
  DebitWalletSchema,
  CreditWalletSchema,
  WalletTransactionQuerySchema,
  UpdateWalletSettingsSchema,
  WalletParamsSchema,
  TransactionParamsSchema,
  UserWalletParamsSchema,
} from './wallet.schema';

// ========== DTOS D'ENTRÉE ==========

export class RechargeWalletDto {
  amount!: number;
  currency?: string;
  description?: string;
  paymentMethod!: string;
  provider?: string;
  returnUrl?: string;

  static validate(data: unknown): RechargeWalletDto {
    return RechargeWalletSchema.parse(data);
  }
}

export class TransferWalletDto {
  recipientUserId!: number;
  amount!: number;
  description?: string;
  currency?: string;

  static validate(data: unknown): TransferWalletDto {
    return TransferWalletSchema.parse(data);
  }
}

export class DebitWalletDto {
  amount!: number;
  description?: string;
  category?: string;
  referenceId?: string;
  sourceType?: string;
  sourceId?: string;

  static validate(data: unknown): DebitWalletDto {
    return DebitWalletSchema.parse(data);
  }
}

export class CreditWalletDto {
  amount!: number;
  description?: string;
  category?: string;
  referenceId?: string;
  sourceType?: string;
  sourceId?: string;

  static validate(data: unknown): CreditWalletDto {
    return CreditWalletSchema.parse(data);
  }
}

export class WalletTransactionQueryDto {
  type?: string;
  status?: string;
  category?: string;
  sourceType?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: string;

  static validate(data: unknown): WalletTransactionQueryDto {
    return WalletTransactionQuerySchema.parse(data);
  }
}

export class UpdateWalletSettingsDto {
  dailyLimit?: number;
  monthlyLimit?: number;
  maxBalance?: number;
  isActive?: boolean;

  static validate(data: unknown): UpdateWalletSettingsDto {
    return UpdateWalletSettingsSchema.parse(data);
  }
}

// ========== DTOS DE PARAMÈTRES ==========

export class WalletParamsDto {
  id!: number;

  static validate(data: unknown): WalletParamsDto {
    return WalletParamsSchema.parse(data);
  }
}

export class TransactionParamsDto {
  id!: number;

  static validate(data: unknown): TransactionParamsDto {
    return TransactionParamsSchema.parse(data);
  }
}

export class UserWalletParamsDto {
  userId!: number;

  static validate(data: unknown): UserWalletParamsDto {
    return UserWalletParamsSchema.parse(data);
  }
}

// ========== TYPES INFÉRÉS ==========

export type RechargeWalletInput = z.infer<typeof RechargeWalletSchema>;
export type TransferWalletInput = z.infer<typeof TransferWalletSchema>;
export type DebitWalletInput = z.infer<typeof DebitWalletSchema>;
export type CreditWalletInput = z.infer<typeof CreditWalletSchema>;
export type WalletTransactionQueryInput = z.infer<
  typeof WalletTransactionQuerySchema
>;
export type UpdateWalletSettingsInput = z.infer<
  typeof UpdateWalletSettingsSchema
>;
export type WalletParamsInput = z.infer<typeof WalletParamsSchema>;
export type TransactionParamsInput = z.infer<typeof TransactionParamsSchema>;
export type UserWalletParamsInput = z.infer<typeof UserWalletParamsSchema>;
