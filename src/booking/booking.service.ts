import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  IBooking,
  ICreateBookingBody,
  IBookingCalculation,
  IBookingWithDetails,
  ICancelBookingBody,
  BookingStatus,
  BookingPaymentStatus,
  RefundStatus,
} from '../_validators/booking';
import { PaymentService } from '../payment/payment.service';
import { WalletService } from '../wallet/wallet.service';
import { v4 as uuidv4 } from 'uuid';
import { Decimal } from '@prisma/client/runtime/library';
import { PaymentMethod, PaymentCurrency } from '@prisma/client';
import { Inject, forwardRef } from '@nestjs/common';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);
  private readonly SERVICE_FEE_PERCENTAGE = 0.1; // 10% de frais de service

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService: PaymentService,
    @Inject(forwardRef(() => WalletService))
    private readonly walletService: WalletService,
  ) {}

  /**
   * Calculer le prix total d'une réservation
   */
  async calculateBookingPrice(
    residenceId: number,
    checkInDate: Date | string,
    checkOutDate: Date | string,
  ): Promise<IBookingCalculation> {
    // Convertir les strings en Dates si nécessaire
    const checkIn =
      typeof checkInDate === 'string' ? new Date(checkInDate) : checkInDate;
    const checkOut =
      typeof checkOutDate === 'string' ? new Date(checkOutDate) : checkOutDate;

    // Vérifier que la résidence existe
    const residence = await this.prisma.residence.findUnique({
      where: { id: residenceId },
      select: { pricePerNight: true, isActive: true },
    });

    if (!residence) {
      throw new NotFoundException('Residence not found');
    }

    if (!residence.isActive) {
      throw new BadRequestException(
        'This residence is not available for booking',
      );
    }

    // Calculer le nombre de nuits
    const numberOfNights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (numberOfNights < 1) {
      throw new BadRequestException('Booking must be at least one night');
    }

    // Calculer les prix
    const pricePerNight = residence.pricePerNight;
    const subtotal = pricePerNight * numberOfNights;
    const serviceFee = subtotal * this.SERVICE_FEE_PERCENTAGE;
    const totalPrice = subtotal + serviceFee;

    return {
      pricePerNight,
      numberOfNights,
      subtotal,
      serviceFee,
      totalPrice,
    };
  }

  /**
   * Vérifier la disponibilité d'une résidence
   */
  async checkAvailability(
    residenceId: number,
    checkInDate: Date | string,
    checkOutDate: Date | string,
  ): Promise<boolean> {
    // Convertir les strings en Dates si nécessaire
    const checkIn =
      typeof checkInDate === 'string' ? new Date(checkInDate) : checkInDate;
    const checkOut =
      typeof checkOutDate === 'string' ? new Date(checkOutDate) : checkOutDate;

    // Vérifier s'il y a des réservations qui se chevauchent
    const overlappingBookings = await this.prisma.booking.count({
      where: {
        residenceId,
        status: {
          in: [
            BookingStatus.CONFIRMED,
            BookingStatus.PENDING,
            BookingStatus.ONGOING,
          ],
        },
        OR: [
          {
            AND: [
              { checkInDate: { lte: checkIn } },
              { checkOutDate: { gt: checkIn } },
            ],
          },
          {
            AND: [
              { checkInDate: { lt: checkOut } },
              { checkOutDate: { gte: checkOut } },
            ],
          },
          {
            AND: [
              { checkInDate: { gte: checkIn } },
              { checkOutDate: { lte: checkOut } },
            ],
          },
        ],
      },
    });

    return overlappingBookings === 0;
  }

  /**
   * Créer une réservation (étape 1: avant paiement)
   */
  async createBooking(
    userId: number,
    data: ICreateBookingBody,
  ): Promise<IBookingWithDetails> {
    const {
      residenceId,
      checkInDate,
      checkOutDate,
      numberOfGuests,
      guestNotes,
      specialRequests,
    } = data;

    // Vérifier la disponibilité
    const isAvailable = await this.checkAvailability(
      residenceId,
      checkInDate,
      checkOutDate,
    );
    if (!isAvailable) {
      throw new BadRequestException(
        'This residence is not available for the selected dates',
      );
    }

    // Calculer les prix
    const calculation = await this.calculateBookingPrice(
      residenceId,
      checkInDate,
      checkOutDate,
    );

    // Générer un numéro de réservation unique
    const bookingNumber = `BK${Date.now()}${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    // Convertir les dates en objets Date si ce sont des strings
    const checkIn =
      typeof checkInDate === 'string' ? new Date(checkInDate) : checkInDate;
    const checkOut =
      typeof checkOutDate === 'string' ? new Date(checkOutDate) : checkOutDate;

    // Créer la réservation
    const booking = await this.prisma.booking.create({
      data: {
        bookingNumber,
        userId,
        residenceId,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfGuests,
        numberOfNights: calculation.numberOfNights,
        pricePerNight: new Decimal(calculation.pricePerNight),
        totalPrice: new Decimal(calculation.subtotal),
        serviceFee: new Decimal(calculation.serviceFee),
        finalPrice: new Decimal(calculation.totalPrice),
        guestNotes,
        specialRequests,
        status: BookingStatus.PENDING,
        paymentStatus: BookingPaymentStatus.UNPAID,
      },
      include: {
        residence: {
          select: {
            id: true,
            title: true,
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
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

    this.logger.log(`Booking created: ${bookingNumber} for user ${userId}`);

    return booking as any;
  }

  /**
   * Initier le paiement d'une réservation
   */
  async initiateBookingPayment(
    userId: number,
    bookingId: number,
    paymentMethod: PaymentMethod,
  ): Promise<{ booking: IBooking; paymentUrl: string }> {
    // Récupérer la réservation
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true,
        residence: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException(
        'You are not authorized to pay for this booking',
      );
    }

    if (booking.paymentStatus === BookingPaymentStatus.PAID) {
      throw new BadRequestException('This booking has already been paid');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('This booking has been cancelled');
    }

    // Créer le paiement via CinetPay
    const payment = await this.paymentService.createPayment(userId, {
      amount: booking.finalPrice.toNumber(),
      currency: PaymentCurrency.XOF,
      description: `Booking payment for ${booking.residence.title}`,
      customerName: `${booking.user.firstName} ${booking.user.lastName}`,
      customerEmail: booking.user.email || undefined,
      customerPhone: booking.user.phoneNumber || undefined,
      paymentMethod,
      metadata: {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        type: 'booking_payment',
      },
    });

    // Mettre à jour la réservation avec l'ID du paiement
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { paymentId: payment.payment.id },
    });

    this.logger.log(`Payment initiated for booking ${booking.bookingNumber}`);

    return {
      booking: booking as any,
      paymentUrl: payment.paymentUrl!,
    };
  }

  /**
   * Confirmer une réservation après paiement réussi
   */
  async confirmBookingPayment(
    bookingId: number,
    paymentId: number,
  ): Promise<IBooking> {
    const booking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CONFIRMED,
        paymentStatus: BookingPaymentStatus.PAID,
        paidAt: new Date(),
      },
    });

    this.logger.log(`Booking confirmed: ${booking.bookingNumber}`);

    // TODO: Envoyer notification de confirmation au client et à l'hôte

    return booking as any;
  }

  /**
   * Annuler une réservation
   */
  async cancelBooking(
    userId: number,
    bookingId: number,
    data: ICancelBookingBody,
  ): Promise<IBooking> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { residence: { select: { ownerId: true } } },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Vérifier les droits (le client ou l'hôte peut annuler)
    if (booking.userId !== userId && booking.residence.ownerId !== userId) {
      throw new ForbiddenException(
        'You are not authorized to cancel this booking',
      );
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('This booking is already cancelled');
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed booking');
    }

    // Calculer le remboursement si demandé et si payé
    let refundAmount: Decimal | null = null;
    let refundStatus: RefundStatus | null = null;

    if (
      data.requestRefund &&
      booking.paymentStatus === BookingPaymentStatus.PAID
    ) {
      // Politique de remboursement:
      // - Plus de 7 jours avant: 100%
      // - 3-7 jours avant: 50%
      // - Moins de 3 jours: 0%
      const daysUntilCheckIn = Math.ceil(
        (booking.checkInDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );

      if (daysUntilCheckIn >= 7) {
        refundAmount = booking.finalPrice;
      } else if (daysUntilCheckIn >= 3) {
        refundAmount = booking.finalPrice.mul(new Decimal(0.5));
      } else {
        refundAmount = new Decimal(0);
      }

      if (refundAmount.gt(0)) {
        refundStatus = RefundStatus.PENDING;
        // TODO: Initier le processus de remboursement
      }
    }

    // Annuler la réservation
    const cancelledBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: userId,
        cancellationReason: data.cancellationReason,
        refundAmount,
        refundStatus,
      },
    });

    this.logger.log(
      `Booking cancelled: ${booking.bookingNumber} by user ${userId}`,
    );

    return cancelledBooking as any;
  }

  /**
   * Récupérer les réservations d'un utilisateur
   */
  async getUserBookings(
    userId: number,
    filters: {
      status?: string;
      startDate?: Date | string;
      endDate?: Date | string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ bookings: IBookingWithDetails[]; total: number }> {
    const { status, startDate, endDate, page = 1, limit = 20 } = filters;

    // Convertir les dates si ce sont des strings
    const filterStartDate = startDate
      ? typeof startDate === 'string'
        ? new Date(startDate)
        : startDate
      : undefined;
    const filterEndDate = endDate
      ? typeof endDate === 'string'
        ? new Date(endDate)
        : endDate
      : undefined;

    const where: any = { userId };

    if (status) {
      where.status = status;
    }

    if (filterStartDate || filterEndDate) {
      where.checkInDate = {};
      if (filterStartDate) where.checkInDate.gte = filterStartDate;
      if (filterEndDate) where.checkInDate.lte = filterEndDate;
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          residence: {
            select: {
              id: true,
              title: true,
              owner: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { created: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { bookings: bookings as any, total };
  }

  /**
   * Récupérer les réservations d'une résidence (pour l'hôte)
   */
  async getResidenceBookings(
    hostId: number,
    filters: {
      residenceId?: number;
      status?: string;
      startDate?: Date | string;
      endDate?: Date | string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ bookings: IBookingWithDetails[]; total: number }> {
    const {
      residenceId,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = filters;

    // Convertir les dates si ce sont des strings
    const filterStartDate = startDate
      ? typeof startDate === 'string'
        ? new Date(startDate)
        : startDate
      : undefined;
    const filterEndDate = endDate
      ? typeof endDate === 'string'
        ? new Date(endDate)
        : endDate
      : undefined;

    const where: any = {
      residence: { ownerId: hostId },
    };

    if (residenceId) {
      where.residenceId = residenceId;
    }

    if (status) {
      where.status = status;
    }

    if (filterStartDate || filterEndDate) {
      where.checkInDate = {};
      if (filterStartDate) where.checkInDate.gte = filterStartDate;
      if (filterEndDate) where.checkInDate.lte = filterEndDate;
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          residence: {
            select: {
              id: true,
              title: true,
              owner: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
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
        orderBy: { created: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { bookings: bookings as any, total };
  }

  /**
   * Récupérer une réservation par ID
   */
  async getBookingById(
    bookingId: number,
    userId?: number,
  ): Promise<IBookingWithDetails> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        residence: {
          select: {
            id: true,
            title: true,
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
        payment: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Vérifier les droits d'accès si userId fourni
    if (
      userId &&
      booking.userId !== userId &&
      booking.residence.owner.id !== userId
    ) {
      throw new ForbiddenException(
        'You are not authorized to view this booking',
      );
    }

    return booking as any;
  }
}
