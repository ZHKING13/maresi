import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Headers,
  Req,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../_guards/roles.guard';
import { CustomRole } from '../_decorators/setters/roles.decorator';
import { CurrentSystemUser } from '../_decorators/getters/currentSystemUser.decorator';
import { PublicEndpoint } from '../_decorators/setters/publicEndpoint.decorator';
import { ROLES_ENUM } from '@prisma/client';
import type {
  IPaymentResponse,
  IPaymentListResponse,
  IPaymentStatusResponse,
  ICreatePaymentDto,
  IPaymentQueryDto,
  IWebhookPayloadDto,
} from '../_validators/payment';
import {
  createPaymentSchema,
  paymentQuerySchema,
  webhookPayloadSchema,
  cinetPayWebhookSchema,
} from '../_validators/payment';
import type { Request } from 'express';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * ===== ENDPOINTS AUTHENTIFIÉS =====
   */

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un nouveau paiement' })
  @ApiResponse({
    status: 201,
    description: 'Paiement créé avec succès',
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async createPayment(
    @CurrentSystemUser() user: { id: number },
    @Body() createPaymentDto: ICreatePaymentDto,
  ): Promise<IPaymentResponse> {
    // Validation du DTO
    const validatedDto = createPaymentSchema.parse(createPaymentDto);
    return this.paymentService.createPayment(user.id, validatedDto);
  }

  @Get('my-payments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtenir mes paiements' })
  @ApiResponse({
    status: 200,
    description: 'Liste de mes paiements',
  })
  async getMyPayments(
    @CurrentSystemUser() user: { id: number },
    @Query() query: IPaymentQueryDto,
  ): Promise<IPaymentListResponse> {
    // Ajouter le filtre utilisateur
    const userQuery = { ...query, userId: user.id };
    const validatedQuery = paymentQuerySchema.parse(userQuery);
    return this.paymentService.getPayments(validatedQuery);
  }

  @Get('my-payments/:transactionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtenir un de mes paiements' })
  @ApiResponse({
    status: 200,
    description: 'Détails du paiement',
  })
  @ApiResponse({ status: 404, description: 'Paiement non trouvé' })
  async getMyPayment(
    @CurrentSystemUser() user: { id: number },
    @Param('transactionId') transactionId: string,
  ) {
    const payment =
      await this.paymentService.getPaymentByTransactionId(transactionId);

    // Vérifier que le paiement appartient à l'utilisateur
    if (payment.userId !== user.id) {
      throw new Error('Accès interdit à ce paiement');
    }

    return payment;
  }

  @Get('status/:transactionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Vérifier le statut d'un paiement" })
  @ApiResponse({
    status: 200,
    description: 'Statut du paiement',
  })
  async checkPaymentStatus(
    @CurrentSystemUser() user: { id: number },
    @Param('transactionId') transactionId: string,
  ): Promise<IPaymentStatusResponse> {
    const payment =
      await this.paymentService.getPaymentByTransactionId(transactionId);

    // Vérifier que le paiement appartient à l'utilisateur
    if (payment.userId !== user.id) {
      throw new Error('Accès interdit à ce paiement');
    }

    return this.paymentService.checkPaymentStatus(transactionId);
  }

  /**
   * ===== ENDPOINTS ADMIN =====
   */

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @CustomRole([ROLES_ENUM.ADMIN])
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtenir tous les paiements (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Liste de tous les paiements',
  })
  async getAllPayments(
    @Query() query: IPaymentQueryDto,
  ): Promise<IPaymentListResponse> {
    const validatedQuery = paymentQuerySchema.parse(query);
    return this.paymentService.getPayments(validatedQuery);
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @CustomRole([ROLES_ENUM.ADMIN])
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtenir un paiement par ID (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Détails du paiement',
  })
  async getPaymentById(@Param('id', ParseIntPipe) paymentId: number) {
    return this.paymentService.getPaymentById(paymentId);
  }

  /**
   * ===== WEBHOOKS PUBLICS =====
   */

  @Post('webhook')
  @PublicEndpoint()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook CinetPay pour les notifications de paiement',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook traité avec succès',
  })
  async handleWebhook(
    @Body() webhookData: any,
    @Headers() headers: Record<string, string>,
    @Req() request: Request,
  ) {
    try {
      // Validation du payload CinetPay
      const validatedPayload = cinetPayWebhookSchema.parse(webhookData);

      // Déterminer le type d'événement
      let eventType = 'payment.unknown';
      if (validatedPayload.cpm_trans_status === 'ACCEPTED') {
        eventType = 'payment.completed';
      } else if (validatedPayload.cpm_trans_status === 'REFUSED') {
        eventType = 'payment.failed';
      } else if (validatedPayload.cpm_trans_status === 'CANCELLED') {
        eventType = 'payment.cancelled';
      }

      const webhookPayload: IWebhookPayloadDto = {
        eventType,
        rawPayload: webhookData,
        signature: validatedPayload.signature,
      };

      const result = await this.paymentService.processWebhook(
        webhookPayload,
        request.ip,
        headers['user-agent'],
      );

      return {
        success: result.processed,
        message: result.message,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Invalid webhook payload',
        error: error.message,
      };
    }
  }

  @Post('webhook/test')
  @PublicEndpoint()
  @ApiOperation({ summary: 'Endpoint de test pour les webhooks' })
  @ApiResponse({
    status: 200,
    description: 'Test webhook',
  })
  async testWebhook(@Body() body: any) {
    // Endpoint pour tester les webhooks en développement
    return {
      received: true,
      timestamp: new Date().toISOString(),
      payload: body,
    };
  }

  /**
   * ===== ENDPOINTS PUBLICS POUR SUCCESS/CANCEL =====
   */

  @Get('success/:transactionId')
  @PublicEndpoint()
  @ApiOperation({ summary: 'Page de succès après paiement' })
  @ApiResponse({
    status: 200,
    description: 'Informations de succès du paiement',
  })
  async paymentSuccess(@Param('transactionId') transactionId: string) {
    try {
      const status =
        await this.paymentService.checkPaymentStatus(transactionId);
      return {
        success: true,
        transactionId,
        status: status.status,
        amount: status.amount,
        currency: status.currency,
        paidAt: status.paidAt,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Transaction non trouvée',
        transactionId,
      };
    }
  }

  @Get('cancel/:transactionId')
  @PublicEndpoint()
  @ApiOperation({ summary: "Page d'annulation après paiement" })
  @ApiResponse({
    status: 200,
    description: "Informations d'annulation du paiement",
  })
  async paymentCancel(@Param('transactionId') transactionId: string) {
    return {
      cancelled: true,
      transactionId,
      message: "Le paiement a été annulé par l'utilisateur",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * ===== ENDPOINTS DE STATISTIQUES =====
   */

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @CustomRole([ROLES_ENUM.ADMIN])
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Statistiques des paiements (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Statistiques des paiements',
  })
  async getPaymentStats(@Query() query: any) {
    // TODO: Implémenter les statistiques
    return {
      message: 'Statistiques des paiements - À implémenter',
      query,
    };
  }

  /**
   * ===== ENDPOINTS D'INFORMATION =====
   */

  @Get('methods')
  @PublicEndpoint()
  @ApiOperation({ summary: 'Obtenir les méthodes de paiement disponibles' })
  @ApiResponse({
    status: 200,
    description: 'Liste des méthodes de paiement',
  })
  async getPaymentMethods() {
    return {
      methods: [
        {
          id: 'MOBILE_MONEY',
          name: 'Mobile Money',
          providers: [
            {
              id: 'ORANGE_MONEY',
              name: 'Orange Money',
              minAmount: 100,
              maxAmount: 1500000,
            },
            {
              id: 'MTN_MONEY',
              name: 'MTN Mobile Money',
              minAmount: 100,
              maxAmount: 2000000,
            },
            {
              id: 'MOOV_MONEY',
              name: 'Moov Money',
              minAmount: 100,
              maxAmount: 1000000,
            },
          ],
        },
        {
          id: 'CREDIT_CARD',
          name: 'Carte Bancaire',
          providers: [
            { id: 'VISA', name: 'Visa', minAmount: 500, maxAmount: 10000000 },
            {
              id: 'MASTERCARD',
              name: 'Mastercard',
              minAmount: 500,
              maxAmount: 10000000,
            },
          ],
        },
      ],
      currencies: ['XOF', 'XAF', 'USD', 'EUR'],
      defaultCurrency: 'XOF',
    };
  }

  @Get('providers/:provider/limits')
  @PublicEndpoint()
  @ApiOperation({ summary: "Obtenir les limites d'un provider de paiement" })
  @ApiResponse({
    status: 200,
    description: 'Limites du provider',
  })
  async getProviderLimits(@Param('provider') provider: string) {
    const limits = {
      ORANGE_MONEY: { min: 100, max: 1500000, currency: 'XOF' },
      MTN_MONEY: { min: 100, max: 2000000, currency: 'XOF' },
      MOOV_MONEY: { min: 100, max: 1000000, currency: 'XOF' },
      VISA: { min: 500, max: 10000000, currency: 'XOF' },
      MASTERCARD: { min: 500, max: 10000000, currency: 'XOF' },
    };

    return limits[provider as keyof typeof limits] || null;
  }
}
