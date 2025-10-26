import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { NotificationTemplateService } from './templates/notification-template.service';
import { NotificationLogService } from './services/notification-log.service';
import { EmailNotificationProvider } from './providers/email-notification.provider';
import { SmsNotificationProvider } from './providers/sms-notification.provider';
import { FcmNotificationProvider } from './providers/fcm-notification.provider';
import { PushInAppNotificationProvider } from './providers/push-inapp-notification.provider';
import { INotificationConfig } from './interfaces/notification.interface';
import { NotificationController } from './notification.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationTemplateService,
    NotificationLogService,
    EmailNotificationProvider,
    SmsNotificationProvider,
    FcmNotificationProvider,
    PushInAppNotificationProvider,
  ],
  exports: [
    NotificationService,
    NotificationTemplateService,
    NotificationLogService,
  ],
})
export class NotificationModule {
  static forRoot(config?: INotificationConfig): DynamicModule {
    return {
      module: NotificationModule,
      imports: [ConfigModule, PrismaModule],
      controllers: [NotificationController],
      providers: [
        NotificationService,
        NotificationTemplateService,
        NotificationLogService,
        EmailNotificationProvider,
        SmsNotificationProvider,
        FcmNotificationProvider,
        PushInAppNotificationProvider,
        {
          provide: 'NOTIFICATION_CONFIG',
          useValue: config || {},
        },
      ],
      exports: [
        NotificationService,
        NotificationTemplateService,
        NotificationLogService,
      ],
      global: true,
    };
  }
}
