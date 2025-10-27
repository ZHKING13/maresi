import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BookingService } from './booking.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../_guards/roles.guard';
import { CustomRole } from '../_decorators/setters/roles.decorator';
import { CustomSwaggerDecorator } from '../_decorators/setters/swagger.decorator';
import { CurrentSystemUser } from '../_decorators/getters/currentSystemUser.decorator';
import type { User } from '@prisma/client';
import {
  CreateBookingDto,
  CancelBookingDto,
  BookingQueryDto,
  CalculatePriceDto,
} from '../_validators/booking';
import { BOOKING_PATHS } from '../_paths/booking';
import { PaymentMethod } from '@prisma/client';

@ApiTags(BOOKING_PATHS.PATH_PREFIX)
@Controller(BOOKING_PATHS.PATH_PREFIX)
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingController {
  private readonly logger = new Logger(BookingController.name);

  constructor(private readonly bookingService: BookingService) {}

  /**
   * Calculer le prix d'une réservation
   */
  @Post(BOOKING_PATHS.CALCULATE)
  @CustomSwaggerDecorator({
    summary: 'Calculate booking price',
    statusOK: true,
    authDec: true,
    badrequestDec: true,
  })
  async calculatePrice(@Body() body: CalculatePriceDto) {
    this.logger.log(`Calculating price for residence ${body.residenceId}`);

    const calculation = await this.bookingService.calculateBookingPrice(
      body.residenceId,
      new Date(body.checkInDate),
      new Date(body.checkOutDate),
    );

    return {
      message: 'Price calculated successfully',
      data: calculation,
    };
  }

  /**
   * Créer une nouvelle réservation
   */
  @Post(BOOKING_PATHS.CREATE)
  @CustomSwaggerDecorator({
    summary: 'Create a new booking',
    statusOK: true,
    authDec: true,
    badrequestDec: true,
    forbiddenDec: true,
  })
  async createBooking(
    @CurrentSystemUser() user: User,
    @Body() createBookingDto: CreateBookingDto,
  ) {
    this.logger.log(`Creating booking for user ${user.id}`);

    const booking = await this.bookingService.createBooking(
      user.id,
      createBookingDto,
    );

    return {
      message: 'Booking created successfully. Please proceed to payment.',
      data: booking,
    };
  }

  /**
   * Initier le paiement d'une réservation
   */
  @Post(BOOKING_PATHS.INITIATE_PAYMENT)
  @CustomSwaggerDecorator({
    summary: 'Initiate booking payment',
    statusOK: true,
    authDec: true,
    badrequestDec: true,
    forbiddenDec: true,
  })
  async initiatePayment(
    @CurrentSystemUser() user: User,
    @Param('id', ParseIntPipe) bookingId: number,
    @Body() body: { paymentMethod: PaymentMethod },
  ) {
    this.logger.log(
      `Initiating payment for booking ${bookingId} by user ${user.id}`,
    );

    const result = await this.bookingService.initiateBookingPayment(
      user.id,
      bookingId,
      body.paymentMethod,
    );

    return {
      message:
        'Payment initiated. Please complete payment using the provided URL.',
      data: result,
    };
  }

  /**
   * Récupérer mes réservations
   */
  @Get(BOOKING_PATHS.MY_BOOKINGS)
  @CustomSwaggerDecorator({
    summary: 'Get my bookings',
    statusOK: true,
    authDec: true,
  })
  async getMyBookings(
    @CurrentSystemUser() user: User,
    @Query() query: BookingQueryDto,
  ) {
    this.logger.log(`Getting bookings for user ${user.id}`);

    const result = await this.bookingService.getUserBookings(user.id, query);

    return {
      message: 'Bookings retrieved successfully',
      data: result.bookings,
      meta: {
        total: result.total,
        page: query.page,
        limit: query.limit,
      },
    };
  }

  /**
   * Récupérer une réservation par ID
   */
  @Get(BOOKING_PATHS.DETAILS)
  @CustomSwaggerDecorator({
    summary: 'Get booking details',
    statusOK: true,
    authDec: true,
    forbiddenDec: true,
  })
  async getBookingDetails(
    @CurrentSystemUser() user: User,
    @Param('id', ParseIntPipe) bookingId: number,
  ) {
    this.logger.log(`Getting booking ${bookingId} details for user ${user.id}`);

    const booking = await this.bookingService.getBookingById(
      bookingId,
      user.id,
    );

    return {
      message: 'Booking retrieved successfully',
      data: booking,
    };
  }

  /**
   * Annuler une réservation
   */
  @Put(BOOKING_PATHS.CANCEL)
  @CustomSwaggerDecorator({
    summary: 'Cancel a booking',
    statusOK: true,
    authDec: true,
    badrequestDec: true,
    forbiddenDec: true,
  })
  async cancelBooking(
    @CurrentSystemUser() user: User,
    @Param('id', ParseIntPipe) bookingId: number,
    @Body() cancelDto: CancelBookingDto,
  ) {
    this.logger.log(`Cancelling booking ${bookingId} by user ${user.id}`);

    const booking = await this.bookingService.cancelBooking(
      user.id,
      bookingId,
      cancelDto,
    );

    return {
      message: 'Booking cancelled successfully',
      data: booking,
    };
  }

  /**
   * Récupérer les réservations de mes résidences (pour les hôtes)
   */
  @Get(BOOKING_PATHS.HOST_BOOKINGS)
  @CustomSwaggerDecorator({
    summary: 'Get bookings for my residences (host only)',
    statusOK: true,
    authDec: true,
  })
  async getHostBookings(
    @CurrentSystemUser() user: User,
    @Query() query: BookingQueryDto,
  ) {
    this.logger.log(`Getting host bookings for user ${user.id}`);

    const result = await this.bookingService.getResidenceBookings(
      user.id,
      query,
    );

    return {
      message: 'Host bookings retrieved successfully',
      data: result.bookings,
      meta: {
        total: result.total,
        page: query.page,
        limit: query.limit,
      },
    };
  }
}
