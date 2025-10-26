import { Module, forwardRef } from '@nestjs/common';
import { WalletController } from './wallet.controller.simple';
import { WalletService } from './wallet.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [PrismaModule, forwardRef(() => PaymentModule)],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
