import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  INotificationProvider,
  INotificationPayload,
  INotificationResult,
  INotificationRecipient,
  INotificationData,
  NotificationType,
} from '../interfaces/notification.interface';
import { NotificationTemplateService } from '../templates/notification-template.service';

interface FCMMessage {
  token: string;
  notification?: {
    title?: string;
    body?: string;
    image?: string;
  };
  data?: Record<string, string>;
  android?: {
    notification?: {
      channel_id?: string;
      priority?: 'min' | 'low' | 'default' | 'high' | 'max';
    };
  };
  apns?: {
    payload?: {
      aps?: {
        sound?: string;
        badge?: number;
      };
    };
  };
}

@Injectable()
export class FcmNotificationProvider implements INotificationProvider {
  readonly type = NotificationType.FCM;
  private readonly logger = new Logger(FcmNotificationProvider.name);
  private _isEnabled: boolean = false;
  private fcmConfig: any;

  constructor(
    private configService: ConfigService,
    private templateService: NotificationTemplateService,
  ) {
    this.initializeProvider();
  }

  get isEnabled(): boolean {
    return this._isEnabled;
  }

  async send(payload: INotificationPayload): Promise<INotificationResult> {
    if (!this.isEnabled) {
      throw new Error('FCM provider is not enabled');
    }

    try {
      const results: INotificationResult[] = [];

      for (const recipient of payload.recipients) {
        if (!this.validateRecipient(recipient)) {
          results.push({
            success: false,
            error: `Invalid FCM token for recipient: ${recipient.id}`,
          });
          continue;
        }

        const fcmMessage = await this.buildFcmMessage(payload.data, recipient);

        try {
          const result = await this.sendFcmMessage(fcmMessage);

          results.push({
            success: true,
            messageId: result.messageId || `fcm_${Date.now()}`,
            deliveredAt: new Date(),
            metadata: {
              recipient: recipient.fcmToken,
              platform: 'fcm',
            },
          });

          this.logger.debug(
            `FCM notification sent successfully to ${recipient.fcmToken}`,
          );
        } catch (error) {
          results.push({
            success: false,
            error: `Failed to send FCM to ${recipient.fcmToken}: ${error.message}`,
          });
          this.logger.error(
            `Failed to send FCM to ${recipient.fcmToken}`,
            error,
          );
        }
      }

      return results[0] || { success: false, error: 'No recipients processed' };
    } catch (error) {
      this.logger.error('Error in FCM provider send method', error);
      return {
        success: false,
        error: `FCM provider error: ${error.message}`,
      };
    }
  }

  validateRecipient(recipient: INotificationRecipient): boolean {
    return !!(recipient.fcmToken && recipient.fcmToken.length > 0);
  }

  async formatMessage(
    data: INotificationData,
    recipient: INotificationRecipient,
  ): Promise<string> {
    try {
      if (data.templateId) {
        const variables = {
          ...data.variables,
          recipientName: recipient.name,
          recipientId: recipient.id,
        };

        const compiled = this.templateService.compileTemplate(
          data.templateId,
          variables,
        );
        return compiled.content;
      } else {
        return data.content;
      }
    } catch (error) {
      this.logger.error('Error formatting FCM message', error);
      return data.content;
    }
  }

  private async buildFcmMessage(
    data: INotificationData,
    recipient: INotificationRecipient,
  ): Promise<FCMMessage> {
    const messageBody = await this.formatMessage(data, recipient);

    const fcmMessage: FCMMessage = {
      token: recipient.fcmToken!,
      notification: {
        title: data.subject || 'Notification',
        body: messageBody,
      },
      data: {
        ...data.metadata,
        timestamp: new Date().toISOString(),
      },
    };

    // Configuration pour Android
    fcmMessage.android = {
      notification: {
        channel_id: 'default_channel',
        priority: this.mapPriorityToAndroid(data.metadata?.priority),
      },
    };

    // Configuration pour iOS
    fcmMessage.apns = {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    };

    return fcmMessage;
  }

  private async sendFcmMessage(
    message: FCMMessage,
  ): Promise<{ messageId: string }> {
    // TODO: Implémenter avec Firebase Admin SDK
    /*
    const admin = require('firebase-admin');
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(this.fcmConfig.serviceAccount),
        projectId: this.fcmConfig.projectId,
      });
    }

    const result = await admin.messaging().send(message);
    return { messageId: result };
    */

    // Simulation pour le développement
    this.logger.debug(
      `[SIMULATED FCM] To: ${message.token}, Title: ${message.notification?.title}, Body: ${message.notification?.body}`,
    );
    return { messageId: `fcm_${Date.now()}` };
  }

  private initializeProvider(): void {
    try {
      this.fcmConfig = this.configService.get('FCM');

      if (!this.fcmConfig || !this.fcmConfig.enabled) {
        this.logger.warn('FCM configuration not found or disabled');
        return;
      }

      this._isEnabled = true;
      this.logger.log('FCM provider initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize FCM provider', error);
      this._isEnabled = false;
    }
  }

  private mapPriorityToAndroid(
    priority?: string,
  ): 'min' | 'low' | 'default' | 'high' | 'max' {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'max';
      case 'high':
        return 'high';
      case 'medium':
        return 'default';
      case 'low':
        return 'low';
      default:
        return 'default';
    }
  }
}
