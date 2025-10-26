import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  INotificationProvider,
  INotificationPayload,
  INotificationResult,
  NotificationType,
  NotificationPriority,
  INotificationRecipient,
  INotificationData,
} from './interfaces/notification.interface';
import { EmailNotificationProvider } from './providers/email-notification.provider';
import { SmsNotificationProvider } from './providers/sms-notification.provider';
import { FcmNotificationProvider } from './providers/fcm-notification.provider';
import { PushInAppNotificationProvider } from './providers/push-inapp-notification.provider';
import { NotificationTemplateService } from './templates/notification-template.service';
import { NotificationLogService } from './services/notification-log.service';
import { InAppNotification } from './interfaces';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly providers: Map<NotificationType, INotificationProvider> =
    new Map();

  constructor(
    private configService: ConfigService,
    private templateService: NotificationTemplateService,
    private logService: NotificationLogService,
    private emailProvider: EmailNotificationProvider,
    private smsProvider: SmsNotificationProvider,
    private fcmProvider: FcmNotificationProvider,
    private pushInAppProvider: PushInAppNotificationProvider,
  ) {
    this.initializeProviders();
  }

  /**
   * Envoyer une notification avec un type spécifique
   */
  async send(
    type: NotificationType,
    recipients: INotificationRecipient[],
    data: INotificationData,
    options?: {
      priority?: NotificationPriority;
      scheduledAt?: Date;
      expiresAt?: Date;
      retryCount?: number;
    },
  ): Promise<INotificationResult> {
    const provider = this.providers.get(type);

    if (!provider) {
      throw new Error(`No provider found for notification type: ${type}`);
    }

    if (!provider.isEnabled) {
      throw new Error(`Provider for ${type} is not enabled`);
    }

    const payload: INotificationPayload = {
      type,
      recipients,
      data,
      priority: options?.priority || NotificationPriority.MEDIUM,
      scheduledAt: options?.scheduledAt,
      expiresAt: options?.expiresAt,
      retryCount: options?.retryCount || 0,
      maxRetries: 3,
    };

    try {
      this.logger.debug(
        `Sending ${type} notification to ${recipients.length} recipients`,
      );

      const result = await provider.send(payload);

      // Enregistrer le log de la notification
      try {
        await this.logService.createLog(payload, result);
      } catch (logError) {
        this.logger.warn(`Failed to log notification: ${logError.message}`);
        // Ne pas faire échouer la notification si le logging échoue
      }

      if (result.success) {
        this.logger.log(
          `Successfully sent ${type} notification: ${result.messageId}`,
        );
      } else {
        this.logger.error(
          `Failed to send ${type} notification: ${result.error}`,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(`Error sending ${type} notification`, error);

      const failedResult = {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };

      // Enregistrer aussi les échecs
      try {
        await this.logService.createLog(payload, failedResult);
      } catch (logError) {
        this.logger.warn(
          `Failed to log failed notification: ${logError.message}`,
        );
      }

      return failedResult;
    }
  }

  /**
   * Envoyer un email
   */
  async sendEmail(
    recipients: INotificationRecipient[],
    data: INotificationData,
    options?: {
      priority?: NotificationPriority;
      scheduledAt?: Date;
    },
  ): Promise<INotificationResult> {
    return this.send(NotificationType.EMAIL, recipients, data, options);
  }

  /**
   * Envoyer un SMS
   */
  async sendSms(
    recipients: INotificationRecipient[],
    data: INotificationData,
    options?: {
      priority?: NotificationPriority;
      scheduledAt?: Date;
    },
  ): Promise<INotificationResult> {
    return this.send(NotificationType.SMS, recipients, data, options);
  }

  /**
   * Envoyer une notification push FCM
   */
  async sendFcm(
    recipients: INotificationRecipient[],
    data: INotificationData,
    options?: {
      priority?: NotificationPriority;
      scheduledAt?: Date;
    },
  ): Promise<INotificationResult> {
    return this.send(NotificationType.FCM, recipients, data, options);
  }

  /**
   * Envoyer une notification in-app
   */
  async sendInApp(
    recipients: INotificationRecipient[],
    data: INotificationData,
    options?: {
      priority?: NotificationPriority;
      expiresAt?: Date;
    },
  ): Promise<INotificationResult> {
    return this.send(NotificationType.PUSH_IN_APP, recipients, data, options);
  }

  /**
   * Envoyer une notification multicanal (plusieurs types)
   */
  async sendMultiChannel(
    types: NotificationType[],
    recipients: INotificationRecipient[],
    data: INotificationData,
    options?: {
      priority?: NotificationPriority;
      scheduledAt?: Date;
      expiresAt?: Date;
      stopOnFirstSuccess?: boolean;
    },
  ): Promise<INotificationResult[]> {
    const results: INotificationResult[] = [];

    for (const type of types) {
      try {
        const result = await this.send(type, recipients, data, options);
        results.push(result);

        // Si on doit s'arrêter au premier succès et qu'on a réussi
        if (options?.stopOnFirstSuccess && result.success) {
          this.logger.debug(
            `Stopping multi-channel send after successful ${type} delivery`,
          );
          break;
        }
      } catch (error) {
        results.push({
          success: false,
          error: `${type}: ${error.message}`,
        });
      }
    }

    return results;
  }

  /**
   * Envoyer avec template
   */
  async sendWithTemplate(
    type: NotificationType,
    templateId: string,
    recipients: INotificationRecipient[],
    variables: Record<string, any> = {},
    options?: {
      priority?: NotificationPriority;
      scheduledAt?: Date;
      expiresAt?: Date;
    },
  ): Promise<INotificationResult> {
    // Valider le template et les variables
    const validation = this.templateService.validateTemplateVariables(
      templateId,
      variables,
    );
    if (!validation.isValid) {
      throw new Error(
        `Missing template variables: ${validation.missingVariables.join(', ')}`,
      );
    }

    const data: INotificationData = {
      templateId,
      content: '', // Sera rempli par le template
      variables,
    };

    return this.send(type, recipients, data, options);
  }

  /**
   * Envoyer un email OTP
   */
  async sendOtpEmail(
    recipient: INotificationRecipient,
    otpCode: string,
    expirationMinutes: number = 10,
  ): Promise<INotificationResult> {
    const variables = {
      firstName: recipient.name?.split(' ')[0] || 'Utilisateur',
      appName: this.configService.get('APP_NAME', 'Application'),
      otpCode,
      expirationMinutes: expirationMinutes.toString(),
    };

    return this.sendWithTemplate(
      NotificationType.EMAIL,
      'otp_email',
      [recipient],
      variables,
      { priority: NotificationPriority.HIGH },
    );
  }

  /**
   * Envoyer un SMS OTP
   */
  async sendOtpSms(
    recipient: INotificationRecipient,
    otpCode: string,
    expirationMinutes: number = 10,
  ): Promise<INotificationResult> {
    const variables = {
      appName: this.configService.get('APP_NAME', 'App'),
      otpCode,
      expirationMinutes: expirationMinutes.toString(),
    };

    return this.sendWithTemplate(
      NotificationType.SMS,
      'otp_sms',
      [recipient],
      variables,
      { priority: NotificationPriority.HIGH },
    );
  }

  /**
   * Envoyer un email de vérification
   */
  async sendVerificationEmail(
    recipient: INotificationRecipient,
    verificationLink: string,
    expirationTime: string = '24 heures',
  ): Promise<INotificationResult> {
    const [firstName, lastName] = (recipient.name || '').split(' ');
    const variables = {
      firstName: firstName || 'Utilisateur',
      lastName: lastName || '',
      appName: this.configService.get('APP_NAME', 'Application'),
      verificationLink,
      expirationTime,
    };

    return this.sendWithTemplate(
      NotificationType.EMAIL,
      'email_verification',
      [recipient],
      variables,
      { priority: NotificationPriority.HIGH },
    );
  }

  /**
   * Envoyer un email de bienvenue
   */
  async sendWelcomeEmail(
    recipient: INotificationRecipient,
    loginLink: string,
  ): Promise<INotificationResult> {
    const [firstName, lastName] = (recipient.name || '').split(' ');
    const variables = {
      firstName: firstName || 'Utilisateur',
      lastName: lastName || '',
      appName: this.configService.get('APP_NAME', 'Application'),
      loginLink,
    };

    return this.sendWithTemplate(
      NotificationType.EMAIL,
      'welcome',
      [recipient],
      variables,
    );
  }

  /**
   * Obtenir les notifications in-app d'un utilisateur
   */
  async getUserInAppNotifications(
    userId: number,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      type?: string;
    } = {},
  ): Promise<InAppNotification[]> {
    return this.pushInAppProvider.getUserNotifications(userId, options);
  }

  /**
   * Marquer une notification in-app comme lue
   */
  async markInAppAsRead(
    notificationId: string,
    userId: number,
  ): Promise<boolean> {
    return this.pushInAppProvider.markAsRead(notificationId, userId);
  }

  /**
   * Obtenir le nombre de notifications non lues
   */
  async getUnreadCount(userId: number): Promise<number> {
    return this.pushInAppProvider.getUnreadCount(userId);
  }

  /**
   * Obtenir les providers disponibles
   */
  getAvailableProviders(): { type: NotificationType; enabled: boolean }[] {
    return Array.from(this.providers.entries()).map(([type, provider]) => ({
      type,
      enabled: provider.isEnabled,
    }));
  }

  /**
   * ===== MÉTHODES DE LOGGING =====
   */

  /**
   * Obtenir les logs des notifications
   */
  async getNotificationLogs(
    query: import('./interfaces/notification.interface').INotificationLogQuery,
  ) {
    return this.logService.getLogs(query);
  }

  /**
   * Obtenir les statistiques des notifications
   */
  async getNotificationStats(startDate?: Date, endDate?: Date) {
    return this.logService.getStats(startDate, endDate);
  }

  /**
   * Nettoyer les anciens logs
   */
  async cleanupOldLogs(): Promise<void> {
    return this.logService.cleanupOldLogs();
  }

  /**
   * Obtenir les paramètres de rétention
   */
  async getRetentionSettings() {
    return this.logService.getRetentionSettings();
  }

  /**
   * Mettre à jour les paramètres de rétention
   */
  async updateRetentionSettings(
    settings: Partial<
      import('./interfaces/notification.interface').IRetentionSettings
    >,
  ) {
    return this.logService.updateRetentionSettings(settings);
  }

  private initializeProviders(): void {
    this.providers.set(NotificationType.EMAIL, this.emailProvider);
    this.providers.set(NotificationType.SMS, this.smsProvider);
    this.providers.set(NotificationType.FCM, this.fcmProvider);
    this.providers.set(NotificationType.PUSH_IN_APP, this.pushInAppProvider);

    const enabledProviders = Array.from(this.providers.entries())
      .filter(([, provider]) => provider.isEnabled)
      .map(([type]) => type);

    this.logger.log(
      `Notification service initialized with providers: ${enabledProviders.join(', ')}`,
    );
  }
}
