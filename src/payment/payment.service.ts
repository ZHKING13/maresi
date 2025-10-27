import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  IPayment,
  IPaymentWebhook,
  ICreatePaymentDto,
  IPaymentQueryDto,
  IPaymentStatsDto,
  IRefundPaymentDto,
  IWebhookPayloadDto,
  IPaymentResponse,
  IPaymentListResponse,
  IPaymentStatusResponse,
  ICinetPayConfig,
  ICinetPayResponse,
  ICinetPayTransactionStatus,
  PaymentStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentCurrency,
  validateAmountByProvider,
} from '../_validators/payment';
import { Decimal } from '@prisma/client/runtime/library';
import { Inject, forwardRef } from '@nestjs/common';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly cinetPayConfig: ICinetPayConfig;
  private bookingService: any; // BookingService sera injecté via setter pour éviter la dépendance circulaire

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const paymentConfig = this.configService.get('paymentenv');
    this.cinetPayConfig = {
      apiKey: paymentConfig.cinetpay.apiKey,
      siteId: paymentConfig.cinetpay.siteId,
      secretKey: paymentConfig.cinetpay.secretKey,
      baseUrl: paymentConfig.cinetpay.baseUrl,
      version: paymentConfig.cinetpay.version,
    };

    if (!paymentConfig.cinetpay.enabled) {
      this.logger.warn('CinetPay is disabled in configuration');
    }
  }

  /**
   * Setter pour BookingService (évite la dépendance circulaire)
   */
  setBookingService(bookingService: any) {
    this.bookingService = bookingService;
  }

  /**
   * ===== CRÉATION ET GESTION DES PAIEMENTS =====
   */

  /**
   * Créer un nouveau paiement
   */
  async createPayment(
    userId: number,
    createPaymentDto: ICreatePaymentDto,
  ): Promise<IPaymentResponse> {
    const {
      amount,
      currency = PaymentCurrency.XOF,
      description,
      paymentMethod,
      provider,
      customerName,
      customerEmail,
      customerPhone,
      returnUrl,
      channels,
      metadata,
    } = createPaymentDto;

    // Validation du montant selon le provider
    if (provider && !validateAmountByProvider(provider, amount)) {
      throw new BadRequestException(
        `Le montant ${amount} ${currency} n'est pas valide pour ${provider}`,
      );
    }

    // Générer un ID de transaction unique
    const transactionId = this.generateTransactionId();

    // Obtenir les informations utilisateur
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Préparer les données de paiement
    const paymentData = {
      transactionId,
      amount: new Decimal(amount),
      currency,
      description: description || `Paiement ${transactionId}`,
      status: PaymentStatus.PENDING,
      paymentMethod,
      provider,
      userId,
      customerName: customerName || `${user.firstName} ${user.lastName}`,
      customerEmail: customerEmail || user.email,
      customerPhone: customerPhone || user.phoneNumber,
      returnUrl,
      channels,
      metadata: metadata || {},
    };

    try {
      // Créer le paiement en base
      const payment = await this.prisma.payment.create({
        data: paymentData,
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

      // Initier le paiement avec CinetPay
      const cinetPayResponse = await this.initiateCinetPayPayment(payment);

      // Mettre à jour le paiement avec les données CinetPay
      const updatedPayment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          cinetPayTransactionId: cinetPayResponse.data?.payment_token,
          paymentUrl: cinetPayResponse.data?.payment_url,
          cinetPayData: cinetPayResponse as any,
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

      this.logger.log(`Payment created: ${transactionId} for user ${userId}`);

      return {
        payment: this.mapPaymentToInterface(updatedPayment),
        paymentUrl: cinetPayResponse.data?.payment_url,
        message: 'Paiement créé avec succès',
      };
    } catch (error) {
      this.logger.error(
        `Failed to create payment: ${error.message}`,
        error.stack,
      );

      // Marquer le paiement comme échoué s'il a été créé
      if (transactionId) {
        await this.prisma.payment.updateMany({
          where: { transactionId },
          data: {
            status: PaymentStatus.FAILED,
            failureReason: error.message,
            failedAt: new Date(),
          },
        });
      }

      throw new InternalServerErrorException(
        'Erreur lors de la création du paiement',
      );
    }
  }

  /**
   * Obtenir les paiements avec filtres et pagination
   */
  async getPayments(query: IPaymentQueryDto): Promise<IPaymentListResponse> {
    const {
      status,
      paymentMethod,
      provider,
      userId,
      startDate,
      endDate,
      limit = 20,
      offset = 0,
      sortBy = 'created',
      sortOrder = 'desc',
    } = query;

    const where: any = {};

    if (status) where.status = status;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (provider) where.provider = provider;
    if (userId) where.userId = userId;

    if (startDate || endDate) {
      where.created = {};
      if (startDate) where.created.gte = startDate;
      if (endDate) where.created.lte = endDate;
    }

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
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
      }),
      this.prisma.payment.count({ where }),
    ]);

    const page = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(total / limit);

    return {
      payments: payments.map((payment) => this.mapPaymentToInterface(payment)),
      total,
      pagination: {
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Obtenir un paiement par ID
   */
  async getPaymentById(paymentId: number): Promise<IPayment> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
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

    if (!payment) {
      throw new NotFoundException('Paiement non trouvé');
    }

    return this.mapPaymentToInterface(payment);
  }

  /**
   * Obtenir un paiement par transaction ID
   */
  async getPaymentByTransactionId(transactionId: string): Promise<IPayment> {
    const payment = await this.prisma.payment.findUnique({
      where: { transactionId },
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

    if (!payment) {
      throw new NotFoundException('Paiement non trouvé');
    }

    return this.mapPaymentToInterface(payment);
  }

  /**
   * Vérifier le statut d'un paiement
   */
  async checkPaymentStatus(
    transactionId: string,
  ): Promise<IPaymentStatusResponse> {
    const payment = await this.getPaymentByTransactionId(transactionId);

    // Vérifier le statut chez CinetPay si le paiement est en cours
    if (
      payment.status === PaymentStatus.PENDING ||
      payment.status === PaymentStatus.PROCESSING
    ) {
      await this.syncPaymentStatusWithCinetPay(payment.cinetPayTransactionId!);

      // Récupérer le paiement mis à jour
      const updatedPayment =
        await this.getPaymentByTransactionId(transactionId);

      return {
        transactionId: updatedPayment.transactionId,
        status: updatedPayment.status,
        amount: updatedPayment.amount,
        currency: updatedPayment.currency,
        paidAt: updatedPayment.paidAt,
        failureReason: updatedPayment.failureReason,
        cinetPayData: updatedPayment.cinetPayData,
      };
    }

    return {
      transactionId: payment.transactionId,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      paidAt: payment.paidAt,
      failureReason: payment.failureReason,
      cinetPayData: payment.cinetPayData,
    };
  }

  /**
   * ===== GESTION DES WEBHOOKS =====
   */

  /**
   * Traiter un webhook CinetPay
   */
  async processWebhook(
    webhookData: IWebhookPayloadDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ processed: boolean; message: string }> {
    try {
      // Enregistrer le webhook
      const webhook = await this.prisma.paymentWebhook.create({
        data: {
          eventType: webhookData.eventType,
          rawPayload: webhookData.rawPayload,
          signature: webhookData.signature,
          ipAddress,
          userAgent,
          processed: false,
        },
      });

      // Traiter le webhook selon le type
      let processed = false;
      let message = 'Webhook reçu';

      if (
        webhookData.eventType === 'payment.completed' ||
        webhookData.eventType === 'ACCEPTED'
      ) {
        processed = await this.handlePaymentSuccess(webhook);
        message = processed
          ? 'Paiement confirmé avec succès'
          : 'Erreur lors de la confirmation';
      } else if (
        webhookData.eventType === 'payment.failed' ||
        webhookData.eventType === 'REFUSED'
      ) {
        processed = await this.handlePaymentFailure(webhook);
        message = processed
          ? 'Échec de paiement traité'
          : "Erreur lors du traitement de l'échec";
      } else if (
        webhookData.eventType === 'payment.cancelled' ||
        webhookData.eventType === 'CANCELLED'
      ) {
        processed = await this.handlePaymentCancellation(webhook);
        message = processed
          ? 'Annulation de paiement traitée'
          : "Erreur lors du traitement de l'annulation";
      }

      // Marquer le webhook comme traité
      await this.prisma.paymentWebhook.update({
        where: { id: webhook.id },
        data: {
          processed,
          processedAt: new Date(),
        },
      });

      return { processed, message };
    } catch (error) {
      this.logger.error(
        `Webhook processing failed: ${error.message}`,
        error.stack,
      );
      return {
        processed: false,
        message: 'Erreur lors du traitement du webhook',
      };
    }
  }

  /**
   * ===== MÉTHODES PRIVÉES =====
   */

  /**
   * Initier un paiement avec CinetPay
   */
  private async initiateCinetPayPayment(
    payment: any,
  ): Promise<ICinetPayResponse> {
    const paymentConfig = this.configService.get('paymentenv');

    const payload = {
      apikey: this.cinetPayConfig.apiKey,
      site_id: this.cinetPayConfig.siteId,
      transaction_id: payment.transactionId,
      amount: payment.amount.toString(),
      currency: payment.currency,
      designation: payment.description,
      customer_name: payment.customerName,
      customer_email: payment.customerEmail,
      customer_phone: payment.customerPhone,
      notify_url: `${paymentConfig.cinetpay.notifyBaseUrl}/api/payments/webhook`,
      return_url:
        payment.returnUrl ||
        `${paymentConfig.cinetpay.returnBaseUrl}/payment/success`,
      cancel_url: `${paymentConfig.cinetpay.returnBaseUrl}/payment/cancel`,
      channels: payment.channels || 'ALL',
      lang: 'fr',
    };

    try {
      const response = await fetch(
        `${this.cinetPayConfig.baseUrl}/${this.cinetPayConfig.version}/payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );

      const result: ICinetPayResponse = await response.json();

      if (result.code !== '201') {
        throw new Error(`CinetPay Error: ${result.message}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`CinetPay API error: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        "Erreur lors de l'initialisation du paiement",
      );
    }
  }

  /**
   * Synchroniser le statut avec CinetPay
   */
  private async syncPaymentStatusWithCinetPay(
    cinetPayTransactionId: string,
  ): Promise<void> {
    try {
      const payload = {
        apikey: this.cinetPayConfig.apiKey,
        site_id: this.cinetPayConfig.siteId,
        transaction_id: cinetPayTransactionId,
      };

      const response = await fetch(
        `${this.cinetPayConfig.baseUrl}/${this.cinetPayConfig.version}/payment/check`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json();

      if (result.code === '00') {
        // Paiement réussi
        await this.updatePaymentStatus(
          cinetPayTransactionId,
          PaymentStatus.COMPLETED,
          result,
        );
      } else if (result.code === '01') {
        // Paiement échoué
        await this.updatePaymentStatus(
          cinetPayTransactionId,
          PaymentStatus.FAILED,
          result,
        );
      }
      // Autres codes = en cours ou en attente
    } catch (error) {
      this.logger.error(
        `Failed to sync payment status: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Mettre à jour le statut d'un paiement
   */
  private async updatePaymentStatus(
    cinetPayTransactionId: string,
    status: PaymentStatus,
    cinetPayData?: any,
  ): Promise<any> {
    const updateData: any = {
      status,
      cinetPayData,
    };

    if (status === PaymentStatus.COMPLETED) {
      updateData.paidAt = new Date();
    } else if (status === PaymentStatus.FAILED) {
      updateData.failedAt = new Date();
      updateData.failureReason = cinetPayData?.message || 'Paiement échoué';
    }

    // Trouver d'abord le paiement pour le retourner
    const payment = await this.prisma.payment.findFirst({
      where: { cinetPayTransactionId },
    });

    if (payment) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: updateData,
      });
    }

    return payment;
  }

  /**
   * Traiter un paiement réussi
   */
  private async handlePaymentSuccess(webhook: any): Promise<boolean> {
    try {
      const { rawPayload } = webhook;
      const cinetPayTransactionId =
        rawPayload.cpm_trans_id || rawPayload.transaction_id;

      if (!cinetPayTransactionId) {
        this.logger.error('No transaction ID found in webhook payload');
        return false;
      }

      const payment = await this.updatePaymentStatus(
        cinetPayTransactionId,
        PaymentStatus.COMPLETED,
        rawPayload,
      );

      // Vérifier le type de paiement dans les métadonnées
      if (payment && payment.metadata && typeof payment.metadata === 'object') {
        const metadata = payment.metadata as any;

        // Gérer le rechargement de wallet
        if (metadata.type === 'WALLET_RECHARGE') {
          this.logger.log(
            `Wallet recharge detected for payment ${payment.id}, will be processed by webhook handler`,
          );
          // La confirmation du wallet sera gérée par un event listener ou séparément
        }

        // Gérer la confirmation de réservation
        if (
          metadata.type === 'booking_payment' &&
          metadata.bookingId &&
          this.bookingService
        ) {
          this.logger.log(
            `Booking payment detected for booking ${metadata.bookingId}`,
          );
          try {
            await this.bookingService.confirmBookingPayment(
              metadata.bookingId,
              payment.id,
            );
            this.logger.log(
              `Booking ${metadata.bookingNumber} confirmed successfully`,
            );
          } catch (error) {
            this.logger.error(
              `Failed to confirm booking ${metadata.bookingId}: ${error.message}`,
            );
          }
        }
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to handle payment success: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Traiter un paiement échoué
   */
  private async handlePaymentFailure(webhook: any): Promise<boolean> {
    try {
      const { rawPayload } = webhook;
      const cinetPayTransactionId =
        rawPayload.cpm_trans_id || rawPayload.transaction_id;

      if (!cinetPayTransactionId) {
        this.logger.error('No transaction ID found in webhook payload');
        return false;
      }

      await this.updatePaymentStatus(
        cinetPayTransactionId,
        PaymentStatus.FAILED,
        rawPayload,
      );

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to handle payment failure: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Traiter une annulation de paiement
   */
  private async handlePaymentCancellation(webhook: any): Promise<boolean> {
    try {
      const { rawPayload } = webhook;
      const cinetPayTransactionId =
        rawPayload.cpm_trans_id || rawPayload.transaction_id;

      if (!cinetPayTransactionId) {
        this.logger.error('No transaction ID found in webhook payload');
        return false;
      }

      await this.updatePaymentStatus(
        cinetPayTransactionId,
        PaymentStatus.CANCELLED,
        rawPayload,
      );

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to handle payment cancellation: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Générer un ID de transaction unique
   */
  private generateTransactionId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `PAY_${timestamp}_${random}`;
  }

  /**
   * Mapper un paiement Prisma vers l'interface
   */
  private mapPaymentToInterface(payment: any): IPayment {
    return {
      id: payment.id,
      transactionId: payment.transactionId,
      cinetPayTransactionId: payment.cinetPayTransactionId,
      amount: parseFloat(payment.amount.toString()),
      currency: payment.currency,
      description: payment.description,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      provider: payment.provider,
      userId: payment.userId,
      customerName: payment.customerName,
      customerEmail: payment.customerEmail,
      customerPhone: payment.customerPhone,
      notifyUrl: payment.notifyUrl,
      returnUrl: payment.returnUrl,
      channels: payment.channels,
      cinetPayData: payment.cinetPayData,
      paymentUrl: payment.paymentUrl,
      metadata: payment.metadata,
      failureReason: payment.failureReason,
      initiatedAt: payment.initiatedAt,
      paidAt: payment.paidAt,
      failedAt: payment.failedAt,
      expiredAt: payment.expiredAt,
      created: payment.created,
      updated: payment.updated,
      user: payment.user,
    };
  }
}
