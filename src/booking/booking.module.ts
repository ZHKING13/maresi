import { Module, forwardRef } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentModule } from '../payment/payment.module';
import { WalletModule } from '../wallet/wallet.module';
import { PaymentService } from '../payment/payment.service';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => PaymentModule),
    forwardRef(() => WalletModule),
  ],
  controllers: [BookingController],
  providers: [
    BookingService,
    {
      provide: 'BOOKING_SERVICE_INJECTOR',
      useFactory: (
        bookingService: BookingService,
        paymentService: PaymentService,
      ) => {
        // Injecter BookingService dans PaymentService pour éviter la dépendance circulaire
        paymentService.setBookingService(bookingService);
        return null;
      },
      inject: [BookingService, PaymentService],
    },
  ],
  exports: [BookingService],
})
export class BookingModule {}
