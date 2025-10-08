import { Module } from '@nestjs/common';
import { SmsService } from './sms.service';
import { ConfigModule } from '@nestjs/config';
import { smsConfig } from 'src/_config';

@Module({
  imports: [ConfigModule.forFeature(smsConfig)],
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
