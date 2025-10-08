import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { NotificationTemplateService } from './templates/notification-template.service';
import { EmailNotificationProvider } from './providers/email-notification.provider';
import { SmsNotificationProvider } from './providers/sms-notification.provider';
import { FcmNotificationProvider } from './providers/fcm-notification.provider';
import { PushInAppNotificationProvider } from './providers/push-inapp-notification.provider';
import { INotificationConfig } from './interfaces/notification.interface';
import { NotificationController } from './notification.controller';

@Module({
  imports: [ConfigModule],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationTemplateService,
    EmailNotificationProvider,
    SmsNotificationProvider,
    FcmNotificationProvider,
    PushInAppNotificationProvider,
  ],
  exports: [NotificationService, NotificationTemplateService],
})
export class NotificationModule {
  static forRoot(config?: INotificationConfig): DynamicModule {
    return {
      module: NotificationModule,
      imports: [ConfigModule],
      controllers: [NotificationController],
      providers: [
        NotificationService,
        NotificationTemplateService,
        EmailNotificationProvider,
        SmsNotificationProvider,
        FcmNotificationProvider,
        PushInAppNotificationProvider,
        {
          provide: 'NOTIFICATION_CONFIG',
          useValue: config || {},
        },
      ],
      exports: [NotificationService, NotificationTemplateService],
      global: true,
    };
  }
}
