import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from '../payment/payment.service';
import {
  Wallet,
  WalletTransaction,
  User,
  WalletTransactionType,
  WalletTransactionStatus,
  PaymentCurrency,
  PaymentMethod,
  PaymentProvider,
  Prisma,
} from '@prisma/client';
import {
  IWallet,
  IWalletTransaction,
  IRechargeWalletDto,
  ITransferWalletDto,
  IDebitWalletDto,
  ICreditWalletDto,
  IWalletTransactionQueryDto,
  IWalletStatsDto,
  IUpdateWalletSettingsDto,
  validateWalletAmount,
  validateWalletLimits,
} from '../_validators/wallet';
import { v4 as uuidv4 } from 'uuid';

// Utilitaires pour la conversion Decimal
const toNumber = (decimal: Prisma.Decimal | null | undefined): number => {
  if (!decimal) return 0;
  return decimal.toNumber();
};

const toDecimal = (num: number): Prisma.Decimal => {
  return new Prisma.Decimal(num);
};

// Fonction pour convertir un wallet Prisma en interface IWallet
const convertWalletToInterface = (wallet: any): IWallet => {
  return {
    ...wallet,
    balance: toNumber(wallet.balance),
    dailyLimit: wallet.dailyLimit ? toNumber(wallet.dailyLimit) : undefined,
    monthlyLimit: wallet.monthlyLimit
      ? toNumber(wallet.monthlyLimit)
      : undefined,
    maxBalance: wallet.maxBalance ? toNumber(wallet.maxBalance) : undefined,
  };
};

// Fonction pour convertir une transaction Prisma en interface IWalletTransaction
const convertTransactionToInterface = (
  transaction: any,
): IWalletTransaction => {
  return {
    ...transaction,
    referenceId: transaction.referenceId || undefined,
    amount: toNumber(transaction.amount),
    balanceBefore: toNumber(transaction.balanceBefore),
    balanceAfter: toNumber(transaction.balanceAfter),
    wallet: transaction.wallet
      ? convertWalletToInterface(transaction.wallet)
      : undefined,
  };
};

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
  ) {}

  // ========== CRÉATION ET GESTION DU WALLET ==========

  async createWallet(
    userId: number,
    currency: PaymentCurrency = PaymentCurrency.XOF,
  ): Promise<IWallet> {
    this.logger.log(
      `Creating wallet for user ${userId} with currency ${currency}`,
    );

    // Vérifier si l'utilisateur existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${userId} non trouvé`);
    }

    // Vérifier si un wallet existe déjà
    const existingWallet = await this.prisma.wallet.findFirst({
      where: { userId, currency },
    });

    if (existingWallet) {
      throw new BadRequestException(
        `Un wallet ${currency} existe déjà pour cet utilisateur`,
      );
    }

    // Créer le wallet
    const wallet = await this.prisma.wallet.create({
      data: {
        userId,
        balance: 0,
        currency,
        isActive: true,
        isBlocked: false,
        dailyLimit: toDecimal(500000), // 500 000 XOF par défaut
        monthlyLimit: toDecimal(5000000), // 5 000 000 XOF par défaut
        maxBalance: toDecimal(10000000), // 10 000 000 XOF par défaut
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });

    this.logger.log(`Wallet created successfully for user ${userId}`);
    return convertWalletToInterface(wallet);
  }

  async getUserWallet(
    userId: number,
    currency: PaymentCurrency = PaymentCurrency.XOF,
  ): Promise<IWallet> {
    const wallet = await this.prisma.wallet.findFirst({
      where: { userId, currency },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });

    if (!wallet) {
      // Créer automatiquement un wallet si il n'en existe pas
      return this.createWallet(userId, currency);
    }

    return convertWalletToInterface(wallet);
  }

  async updateWalletSettings(
    userId: number,
    settings: IUpdateWalletSettingsDto,
  ): Promise<IWallet> {
    this.logger.log(`Updating wallet settings for user ${userId}`);

    const wallet = await this.getUserWallet(userId);

    const updatedWallet = await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        ...settings,
        updated: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });

    this.logger.log(`Wallet settings updated for user ${userId}`);
    return convertWalletToInterface(updatedWallet);
  }

  // ========== RECHARGEMENT DU WALLET ==========

  async rechargeWallet(
    userId: number,
    rechargeData: IRechargeWalletDto,
  ): Promise<{
    transaction: IWalletTransaction;
    paymentUrl?: string;
    paymentId?: string;
  }> {
    this.logger.log(
      `Recharging wallet for user ${userId} with amount ${rechargeData.amount}`,
    );

    const wallet = await this.getUserWallet(
      userId,
      rechargeData.currency as PaymentCurrency,
    );

    // Vérifier si le wallet est actif
    if (!wallet.isActive || wallet.isBlocked) {
      throw new ForbiddenException('Wallet inactif ou bloqué');
    }

    // Vérifier les limites
    const dailySpent = await this.getDailySpent(wallet.id);
    const monthlySpent = await this.getMonthlySpent(wallet.id);

    validateWalletLimits(
      rechargeData.amount,
      wallet.balance,
      dailySpent,
      monthlySpent,
      {
        dailyLimit: wallet.dailyLimit,
        monthlyLimit: wallet.monthlyLimit,
        maxBalance: wallet.maxBalance,
      },
    );

    // Créer une transaction en attente
    const transactionId = `WRT_${Date.now()}_${uuidv4().substring(0, 8)}`;

    const transaction = await this.prisma.walletTransaction.create({
      data: {
        transactionId,
        walletId: wallet.id,
        userId,
        type: WalletTransactionType.CREDIT,
        amount: rechargeData.amount,
        currency: rechargeData.currency as PaymentCurrency,
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance, // Sera mis à jour lors de la confirmation
        status: WalletTransactionStatus.PENDING,
        description: rechargeData.description || 'Rechargement du wallet',
        category: 'RECHARGE',
        sourceType: 'PAYMENT',
        metadata: {
          paymentMethod: rechargeData.paymentMethod,
          provider: rechargeData.provider || null,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        wallet: true,
      },
    });

    // Créer le paiement via CinetPay
    try {
      const paymentResult = await this.paymentService.createPayment(userId, {
        amount: rechargeData.amount,
        currency: rechargeData.currency as PaymentCurrency,
        description: `Rechargement wallet - ${transaction.transactionId}`,
        paymentMethod: rechargeData.paymentMethod as PaymentMethod,
        provider: rechargeData.provider as PaymentProvider,
        returnUrl: rechargeData.returnUrl,
        metadata: {
          walletTransactionId: transaction.id,
          walletId: wallet.id,
          type: 'WALLET_RECHARGE',
        },
      });

      // Mettre à jour la transaction avec les informations du paiement
      await this.prisma.walletTransaction.update({
        where: { id: transaction.id },
        data: {
          sourceId: paymentResult.payment.id.toString(),
          metadata: {
            ...((transaction.metadata as Record<string, any>) || {}),
            paymentId: paymentResult.payment.id,
            cinetpayTransactionId: paymentResult.payment.transactionId,
          },
        },
      });

      this.logger.log(
        `Wallet recharge initiated for user ${userId}, transaction ${transactionId}`,
      );

      return {
        transaction: convertTransactionToInterface(transaction),
        paymentUrl: paymentResult.paymentUrl,
        paymentId: paymentResult.payment.transactionId,
      };
    } catch (error) {
      // Marquer la transaction comme échouée
      await this.prisma.walletTransaction.update({
        where: { id: transaction.id },
        data: {
          status: WalletTransactionStatus.FAILED,
          failureReason: error.message,
        },
      });

      this.logger.error(
        `Wallet recharge failed for user ${userId}: ${error.message}`,
      );
      throw error;
    }
  }

  // ========== CONFIRMATION DE RECHARGEMENT (WEBHOOK) ==========

  async confirmRecharge(paymentId: number): Promise<void> {
    this.logger.log(`Confirming wallet recharge for payment ${paymentId}`);

    // Trouver la transaction wallet liée au paiement
    const transaction = await this.prisma.walletTransaction.findFirst({
      where: {
        sourceId: paymentId.toString(),
        sourceType: 'PAYMENT',
        status: WalletTransactionStatus.PENDING,
      },
      include: {
        wallet: true,
      },
    });

    if (!transaction) {
      this.logger.warn(
        `No pending wallet transaction found for payment ${paymentId}`,
      );
      return;
    }

    // Vérifier le statut du paiement
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      this.logger.error(`Payment ${paymentId} not found`);
      return;
    }

    if (payment.status === 'COMPLETED') {
      // Créditer le wallet
      await this.creditWalletBalance(transaction.walletId, {
        amount: toNumber(transaction.amount),
        description: 'Rechargement confirmé',
        category: 'RECHARGE_CONFIRMED',
        referenceId: transaction.transactionId,
        sourceType: 'PAYMENT_CONFIRMATION',
        sourceId: paymentId.toString(),
      });

      this.logger.log(`Wallet recharged successfully for payment ${paymentId}`);
    } else if (payment.status === 'FAILED' || payment.status === 'CANCELLED') {
      // Marquer la transaction comme échouée
      await this.prisma.walletTransaction.update({
        where: { id: transaction.id },
        data: {
          status: WalletTransactionStatus.FAILED,
          failureReason: 'Paiement échoué ou annulé',
        },
      });

      this.logger.log(`Wallet recharge failed for payment ${paymentId}`);
    }
  }

  // ========== OPÉRATIONS SUR LE SOLDE ==========

  async creditWalletBalance(
    walletId: number,
    creditData: ICreditWalletDto,
  ): Promise<IWalletTransaction> {
    this.logger.log(
      `Crediting wallet ${walletId} with amount ${creditData.amount}`,
    );

    return this.prisma.$transaction(async (tx) => {
      // Récupérer le wallet avec verrouillage
      const wallet = await tx.wallet.findUnique({
        where: { id: walletId },
      });

      if (!wallet) {
        throw new NotFoundException(`Wallet avec l'ID ${walletId} non trouvé`);
      }

      if (!wallet.isActive || wallet.isBlocked) {
        throw new ForbiddenException('Wallet inactif ou bloqué');
      }

      const currentBalance = toNumber(wallet.balance);
      const newBalance = currentBalance + creditData.amount;
      const maxBalance = wallet.maxBalance ? toNumber(wallet.maxBalance) : null;

      // Vérifier le solde maximum
      if (maxBalance && newBalance > maxBalance) {
        throw new BadRequestException(
          `Solde maximum dépassé (${maxBalance} ${wallet.currency})`,
        );
      }

      // Créer la transaction
      const transactionId = `WCT_${Date.now()}_${uuidv4().substring(0, 8)}`;

      const transaction = await tx.walletTransaction.create({
        data: {
          transactionId,
          walletId,
          userId: wallet.userId,
          type: WalletTransactionType.CREDIT,
          amount: toDecimal(creditData.amount),
          currency: wallet.currency,
          balanceBefore: wallet.balance,
          balanceAfter: toDecimal(newBalance),
          status: WalletTransactionStatus.COMPLETED,
          description: creditData.description || 'Crédit au wallet',
          category: creditData.category || 'CREDIT',
          referenceId: creditData.referenceId,
          sourceType: creditData.sourceType,
          sourceId: creditData.sourceId,
          processedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          wallet: true,
        },
      });

      // Mettre à jour le solde du wallet
      await tx.wallet.update({
        where: { id: walletId },
        data: {
          balance: toDecimal(newBalance),
          updated: new Date(),
          lastTransactionAt: new Date(),
        },
      });

      this.logger.log(
        `Wallet ${walletId} credited successfully. New balance: ${newBalance}`,
      );
      return convertTransactionToInterface(transaction);
    });
  }

  async debitWalletBalance(
    walletId: number,
    debitData: IDebitWalletDto,
  ): Promise<IWalletTransaction> {
    this.logger.log(
      `Debiting wallet ${walletId} with amount ${debitData.amount}`,
    );

    return this.prisma.$transaction(async (tx) => {
      // Récupérer le wallet avec verrouillage
      const wallet = await tx.wallet.findUnique({
        where: { id: walletId },
      });

      if (!wallet) {
        throw new NotFoundException(`Wallet avec l'ID ${walletId} non trouvé`);
      }

      if (!wallet.isActive || wallet.isBlocked) {
        throw new ForbiddenException('Wallet inactif ou bloqué');
      }

      const currentBalance = toNumber(wallet.balance);

      // Vérifier le solde suffisant
      validateWalletAmount(debitData.amount, currentBalance, 'debit');

      const newBalance = currentBalance - debitData.amount;

      // Créer la transaction
      const transactionId = `WDT_${Date.now()}_${uuidv4().substring(0, 8)}`;

      const transaction = await tx.walletTransaction.create({
        data: {
          transactionId,
          walletId,
          userId: wallet.userId,
          type: WalletTransactionType.DEBIT,
          amount: toDecimal(debitData.amount),
          currency: wallet.currency,
          balanceBefore: wallet.balance,
          balanceAfter: toDecimal(newBalance),
          status: WalletTransactionStatus.COMPLETED,
          description: debitData.description || 'Débit du wallet',
          category: debitData.category || 'DEBIT',
          referenceId: debitData.referenceId,
          sourceType: debitData.sourceType,
          sourceId: debitData.sourceId,
          processedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          wallet: true,
        },
      });

      // Mettre à jour le solde du wallet
      await tx.wallet.update({
        where: { id: walletId },
        data: {
          balance: toDecimal(newBalance),
          updated: new Date(),
          lastTransactionAt: new Date(),
        },
      });

      this.logger.log(
        `Wallet ${walletId} debited successfully. New balance: ${newBalance}`,
      );
      return convertTransactionToInterface(transaction);
    });
  }

  // ========== TRANSFERT ENTRE WALLETS ==========

  async transferBetweenWallets(
    senderUserId: number,
    transferData: ITransferWalletDto,
  ): Promise<{
    senderTransaction: IWalletTransaction;
    receiverTransaction: IWalletTransaction;
  }> {
    this.logger.log(
      `Transferring ${transferData.amount} from user ${senderUserId} to user ${transferData.recipientUserId}`,
    );

    if (senderUserId === transferData.recipientUserId) {
      throw new BadRequestException(
        'Impossible de transférer vers son propre wallet',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Obtenir les wallets
      const senderWallet = await this.getUserWallet(
        senderUserId,
        transferData.currency as PaymentCurrency,
      );
      const receiverWallet = await this.getUserWallet(
        transferData.recipientUserId,
        transferData.currency as PaymentCurrency,
      );

      // Vérifier les conditions du sender
      if (!senderWallet.isActive || senderWallet.isBlocked) {
        throw new ForbiddenException('Votre wallet est inactif ou bloqué');
      }

      if (!receiverWallet.isActive || receiverWallet.isBlocked) {
        throw new ForbiddenException(
          'Le wallet du destinataire est inactif ou bloqué',
        );
      }

      // Vérifier le solde
      validateWalletAmount(transferData.amount, senderWallet.balance, 'debit');

      // Vérifier les limites du sender
      const dailySpent = await this.getDailySpent(senderWallet.id);
      const monthlySpent = await this.getMonthlySpent(senderWallet.id);

      validateWalletLimits(
        transferData.amount,
        senderWallet.balance,
        dailySpent,
        monthlySpent,
        {
          dailyLimit: senderWallet.dailyLimit,
          monthlyLimit: senderWallet.monthlyLimit,
        },
      );

      // Vérifier les limites du receiver
      if (
        receiverWallet.maxBalance &&
        receiverWallet.balance + transferData.amount > receiverWallet.maxBalance
      ) {
        throw new BadRequestException(
          'Le destinataire a atteint son solde maximum',
        );
      }

      const transferId = `TRF_${Date.now()}_${uuidv4().substring(0, 8)}`;

      // Débiter le sender
      const senderTransaction = await this.debitWalletBalance(senderWallet.id, {
        amount: transferData.amount,
        description: `Transfert vers ${receiverWallet.user?.firstName} ${receiverWallet.user?.lastName}`,
        category: 'TRANSFER_OUT',
        referenceId: transferId,
        sourceType: 'TRANSFER',
        sourceId: receiverWallet.id.toString(),
      });

      // Créditer le receiver
      const receiverTransaction = await this.creditWalletBalance(
        receiverWallet.id,
        {
          amount: transferData.amount,
          description: `Transfert de ${senderWallet.user?.firstName} ${senderWallet.user?.lastName}`,
          category: 'TRANSFER_IN',
          referenceId: transferId,
          sourceType: 'TRANSFER',
          sourceId: senderWallet.id.toString(),
        },
      );

      this.logger.log(`Transfer completed: ${transferId}`);

      return {
        senderTransaction,
        receiverTransaction,
      };
    });
  }

  // ========== CONSULTATION DES TRANSACTIONS ==========

  async getWalletTransactions(
    userId: number,
    query: IWalletTransactionQueryDto,
  ): Promise<{
    transactions: IWalletTransaction[];
    total: number;
    pagination: {
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const wallet = await this.getUserWallet(userId);

    const whereClause: any = {
      walletId: wallet.id,
    };

    // Appliquer les filtres
    if (query.type) {
      whereClause.type = query.type;
    }

    if (query.status) {
      whereClause.status = query.status;
    }

    if (query.category) {
      whereClause.category = { contains: query.category, mode: 'insensitive' };
    }

    if (query.sourceType) {
      whereClause.sourceType = query.sourceType;
    }

    if (query.startDate || query.endDate) {
      whereClause.created = {};
      if (query.startDate) {
        whereClause.created.gte = query.startDate;
      }
      if (query.endDate) {
        whereClause.created.lte = query.endDate;
      }
    }

    if (query.minAmount || query.maxAmount) {
      whereClause.amount = {};
      if (query.minAmount) {
        whereClause.amount.gte = query.minAmount;
      }
      if (query.maxAmount) {
        whereClause.amount.lte = query.maxAmount;
      }
    }

    // Comptage total
    const total = await this.prisma.walletTransaction.count({
      where: whereClause,
    });

    // Récupération des transactions
    const transactions = await this.prisma.walletTransaction.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        wallet: true,
      },
      orderBy: {
        [query.sortBy || 'created']: query.sortOrder || 'desc',
      },
      skip: query.offset || 0,
      take: query.limit || 20,
    });

    const totalPages = Math.ceil(total / (query.limit || 20));
    const currentPage =
      Math.floor((query.offset || 0) / (query.limit || 20)) + 1;

    return {
      transactions: transactions.map(convertTransactionToInterface),
      total,
      pagination: {
        page: currentPage,
        limit: query.limit || 20,
        totalPages,
      },
    };
  }

  // ========== STATISTIQUES ==========

  async getWalletStats(userId: number): Promise<IWalletStatsDto> {
    const wallet = await this.getUserWallet(userId);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Statistiques générales
    const [totalStats, monthlyStats, categoryStats] = await Promise.all([
      this.prisma.walletTransaction.aggregate({
        where: {
          walletId: wallet.id,
          status: WalletTransactionStatus.COMPLETED,
        },
        _sum: {
          amount: true,
        },
        _count: {
          id: true,
        },
      }),

      this.prisma.walletTransaction.groupBy({
        by: ['type'],
        where: {
          walletId: wallet.id,
          status: WalletTransactionStatus.COMPLETED,
          created: { gte: startOfMonth },
        },
        _sum: {
          amount: true,
        },
        _count: {
          id: true,
        },
      }),

      this.prisma.walletTransaction.groupBy({
        by: ['category'],
        where: {
          walletId: wallet.id,
          status: WalletTransactionStatus.COMPLETED,
        },
        _sum: {
          amount: true,
        },
        _count: {
          id: true,
        },
      }),
    ]);

    const pendingCount = await this.prisma.walletTransaction.count({
      where: {
        walletId: wallet.id,
        status: WalletTransactionStatus.PENDING,
      },
    });

    const lastTransaction = await this.prisma.walletTransaction.findFirst({
      where: { walletId: wallet.id },
      orderBy: { created: 'desc' },
    });

    // Calculer les totaux par type
    const monthlyCredits = monthlyStats
      .filter((stat) => stat.type === WalletTransactionType.CREDIT)
      .reduce((sum, stat) => sum + toNumber(stat._sum.amount), 0);

    const monthlyDebits = monthlyStats
      .filter((stat) => stat.type === WalletTransactionType.DEBIT)
      .reduce((sum, stat) => sum + toNumber(stat._sum.amount), 0);

    const monthlyTransactionCount = monthlyStats.reduce(
      (sum, stat) => sum + stat._count.id,
      0,
    );

    // Calculer les totaux généraux par type
    const creditStats = await this.prisma.walletTransaction.aggregate({
      where: {
        walletId: wallet.id,
        type: WalletTransactionType.CREDIT,
        status: WalletTransactionStatus.COMPLETED,
      },
      _sum: { amount: true },
    });

    const debitStats = await this.prisma.walletTransaction.aggregate({
      where: {
        walletId: wallet.id,
        type: WalletTransactionType.DEBIT,
        status: WalletTransactionStatus.COMPLETED,
      },
      _sum: { amount: true },
    });

    // Formater les statistiques par catégorie
    const categoryBreakdown: {
      [category: string]: { amount: number; count: number };
    } = {};
    categoryStats.forEach((stat) => {
      if (stat.category) {
        categoryBreakdown[stat.category] = {
          amount: toNumber(stat._sum.amount),
          count: stat._count.id,
        };
      }
    });

    return {
      totalBalance: wallet.balance,
      currency: wallet.currency,
      totalTransactions: totalStats._count.id,
      totalCredits: toNumber(creditStats._sum.amount),
      totalDebits: toNumber(debitStats._sum.amount),
      pendingTransactions: pendingCount,
      lastTransactionDate: lastTransaction?.created,
      monthlyStats: {
        totalCredits: monthlyCredits,
        totalDebits: monthlyDebits,
        transactionCount: monthlyTransactionCount,
      },
      categoryBreakdown,
    };
  }

  // ========== MÉTHODES UTILITAIRES ==========

  private async getDailySpent(walletId: number): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await this.prisma.walletTransaction.aggregate({
      where: {
        walletId,
        type: WalletTransactionType.DEBIT,
        status: WalletTransactionStatus.COMPLETED,
        created: {
          gte: today,
          lt: tomorrow,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return toNumber(result._sum.amount);
  }

  private async getMonthlySpent(walletId: number): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const result = await this.prisma.walletTransaction.aggregate({
      where: {
        walletId,
        type: WalletTransactionType.DEBIT,
        status: WalletTransactionStatus.COMPLETED,
        created: {
          gte: startOfMonth,
          lt: startOfNextMonth,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return toNumber(result._sum.amount);
  }
}
