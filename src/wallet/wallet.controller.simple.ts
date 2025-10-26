import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  HttpStatus,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentSystemUser } from '../_decorators/getters/currentSystemUser.decorator';
import { CustomSwaggerDecorator } from '../_decorators/setters/swagger.decorator';
import { WALLET_PATHS } from '../_paths/wallet';
import type { User } from '@prisma/client';
import { PaymentCurrency } from '@prisma/client';

@ApiTags(WALLET_PATHS.PATH_PREFIX)
@Controller(WALLET_PATHS.PATH_PREFIX)
@UseGuards(JwtAuthGuard)
export class WalletController {
  private readonly logger = new Logger(WalletController.name);

  constructor(private readonly walletService: WalletService) {}

  @Get(WALLET_PATHS.BALANCE)
  @CustomSwaggerDecorator({
    summary: 'Obtenir le solde du wallet utilisateur',
    statusOK: true,
    authDec: true,
  })
  async getBalance(
    @CurrentSystemUser() user: User,
    @Query('currency') currency?: PaymentCurrency,
  ) {
    this.logger.log(`Getting wallet balance for user ${user.id}`);

    const wallet = await this.walletService.getUserWallet(
      user.id,
      currency || PaymentCurrency.XOF,
    );

    return {
      balance: wallet.balance,
      currency: wallet.currency,
      isActive: wallet.isActive,
      isBlocked: wallet.isBlocked,
      dailyLimit: wallet.dailyLimit,
      monthlyLimit: wallet.monthlyLimit,
    };
  }

  @Get(WALLET_PATHS.DETAILS)
  @CustomSwaggerDecorator({
    summary: 'Obtenir les détails du wallet',
    statusOK: true,
    authDec: true,
  })
  async getWallet(
    @CurrentSystemUser() user: User,
    @Query('currency') currency?: PaymentCurrency,
  ) {
    this.logger.log(`Getting wallet details for user ${user.id}`);

    const wallet = await this.walletService.getUserWallet(
      user.id,
      currency || PaymentCurrency.XOF,
    );

    return {
      wallet,
      message: 'Détails du wallet récupérés avec succès',
    };
  }

  @Put(WALLET_PATHS.SETTINGS)
  @CustomSwaggerDecorator({
    summary: 'Mettre à jour les paramètres du wallet',
    statusOK: true,
    authDec: true,
  })
  async updateWalletSettings(
    @CurrentSystemUser() user: User,
    @Body() updateSettingsDto: any,
  ) {
    this.logger.log(`Updating wallet settings for user ${user.id}`);

    const wallet = await this.walletService.updateWalletSettings(
      user.id,
      updateSettingsDto,
    );

    return {
      wallet,
      message: 'Paramètres du wallet mis à jour avec succès',
    };
  }

  @Post(WALLET_PATHS.RECHARGE)
  @CustomSwaggerDecorator({
    summary: 'Recharger le wallet',
    statusOK: true,
    authDec: true,
    badrequestDec: true,
  })
  async rechargeWallet(
    @CurrentSystemUser() user: User,
    @Body() rechargeDto: any,
  ) {
    this.logger.log(
      `Recharging wallet for user ${user.id} with amount ${rechargeDto.amount}`,
    );

    const result = await this.walletService.rechargeWallet(
      user.id,
      rechargeDto,
    );

    return {
      transaction: result.transaction,
      paymentUrl: result.paymentUrl,
      paymentId: result.paymentId,
      message:
        'Rechargement initié avec succès. Veuillez finaliser le paiement.',
    };
  }

  @Post(WALLET_PATHS.TRANSFER)
  @CustomSwaggerDecorator({
    summary: "Transférer de l'argent",
    statusOK: true,
    authDec: true,
    badrequestDec: true,
    forbiddenDec: true,
  })
  async transferMoney(
    @CurrentSystemUser() user: User,
    @Body() transferDto: any,
  ) {
    this.logger.log(
      `Transferring money from user ${user.id} to user ${transferDto.recipientUserId}`,
    );

    const result = await this.walletService.transferBetweenWallets(
      user.id,
      transferDto,
    );

    return {
      senderTransaction: result.senderTransaction,
      receiverTransaction: result.receiverTransaction,
      message: 'Transfert effectué avec succès',
    };
  }

  @Get(WALLET_PATHS.TRANSACTIONS)
  @CustomSwaggerDecorator({
    summary: "Obtenir l'historique des transactions",
    statusOK: true,
    authDec: true,
  })
  async getTransactions(
    @CurrentSystemUser() user: User,
    @Query() queryDto: any,
  ) {
    this.logger.log(`Getting transactions for user ${user.id}`);

    const result = await this.walletService.getWalletTransactions(
      user.id,
      queryDto,
    );

    return result;
  }

  @Get(WALLET_PATHS.TRANSACTION_BY_ID)
  @CustomSwaggerDecorator({
    summary: "Obtenir les détails d'une transaction",
    statusOK: true,
    authDec: true,
    badrequestDec: true,
  })
  async getTransaction(
    @CurrentSystemUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    this.logger.log(`Getting transaction ${id} for user ${user.id}`);

    const transactions = await this.walletService.getWalletTransactions(
      user.id,
      {
        limit: 1,
        offset: 0,
      },
    );

    const transaction = transactions.transactions.find((t) => t.id === id);

    if (!transaction) {
      throw new BadRequestException(
        'Transaction non trouvée ou accès non autorisé',
      );
    }

    const wallet = await this.walletService.getUserWallet(user.id);

    return {
      transaction,
      wallet,
      message: 'Détails de la transaction récupérés avec succès',
    };
  }

  @Get(WALLET_PATHS.STATS)
  @CustomSwaggerDecorator({
    summary: 'Obtenir les statistiques du wallet',
    statusOK: true,
    authDec: true,
  })
  async getWalletStats(@CurrentSystemUser() user: User) {
    this.logger.log(`Getting wallet stats for user ${user.id}`);

    return this.walletService.getWalletStats(user.id);
  }
}
