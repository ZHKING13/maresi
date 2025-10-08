import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  INotificationProvider,
  INotificationPayload,
  INotificationResult,
  INotificationRecipient,
  INotificationData,
  NotificationType,
  NotificationStatus,
} from '../interfaces/notification.interface';
import { NotificationTemplateService } from '../templates/notification-template.service';

interface InAppNotification {
  id: string;
  userId: number;
  title: string;
  content: string;
  type: string;
  status: NotificationStatus;
  metadata?: Record<string, any>;
  createdAt: Date;
  readAt?: Date;
  expiresAt?: Date;
}

@Injectable()
export class PushInAppNotificationProvider implements INotificationProvider {
  readonly type = NotificationType.PUSH_IN_APP;
  private readonly logger = new Logger(PushInAppNotificationProvider.name);
  private _isEnabled: boolean = true; // Toujours disponible car interne
  private notifications: Map<string, InAppNotification> = new Map();
  private userNotifications: Map<number, string[]> = new Map();

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
    try {
      const results: INotificationResult[] = [];

      for (const recipient of payload.recipients) {
        if (!this.validateRecipient(recipient)) {
          results.push({
            success: false,
            error: `Invalid userId for in-app notification: ${recipient.userId}`,
          });
          continue;
        }

        const formattedMessage = await this.formatMessage(
          payload.data,
          recipient,
        );
        const notificationId = this.generateNotificationId();

        const notification: InAppNotification = {
          id: notificationId,
          userId: recipient.userId!,
          title: payload.data.subject || 'Notification',
          content: formattedMessage,
          type: payload.data.metadata?.type || 'general',
          status: NotificationStatus.SENT,
          metadata: payload.data.metadata,
          createdAt: new Date(),
          expiresAt: payload.expiresAt || this.getDefaultExpirationDate(),
        };

        try {
          this.storeNotification(notification);

          results.push({
            success: true,
            messageId: notificationId,
            deliveredAt: new Date(),
            metadata: {
              recipient: recipient.userId,
              notificationType: 'in_app',
            },
          });

          this.logger.debug(
            `In-app notification stored for user ${recipient.userId}: ${notificationId}`,
          );

          // Émettre un événement pour les WebSockets/SSE si disponible
          this.emitNotificationEvent(notification);
        } catch (error) {
          results.push({
            success: false,
            error: `Failed to store in-app notification for user ${recipient.userId}: ${error.message}`,
          });
          this.logger.error(
            `Failed to store in-app notification for user ${recipient.userId}`,
            error,
          );
        }
      }

      return results[0] || { success: false, error: 'No recipients processed' };
    } catch (error) {
      this.logger.error('Error in in-app provider send method', error);
      return {
        success: false,
        error: `In-app provider error: ${error.message}`,
      };
    }
  }

  validateRecipient(recipient: INotificationRecipient): boolean {
    return !!(recipient.userId && recipient.userId > 0);
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
          recipientId: recipient.userId,
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
      this.logger.error('Error formatting in-app message', error);
      return data.content;
    }
  }

  /**
   * Récupérer les notifications d'un utilisateur
   */
  async getUserNotifications(
    userId: number,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      type?: string;
    } = {},
  ): Promise<InAppNotification[]> {
    const userNotificationIds = this.userNotifications.get(userId) || [];
    let notifications = userNotificationIds
      .map((id) => this.notifications.get(id))
      .filter(Boolean) as InAppNotification[];

    // Filtrer par statut de lecture
    if (options.unreadOnly) {
      notifications = notifications.filter(
        (n) => n.status !== NotificationStatus.READ,
      );
    }

    // Filtrer par type
    if (options.type) {
      notifications = notifications.filter((n) => n.type === options.type);
    }

    // Trier par date de création (plus récent en premier)
    notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Pagination
    const offset = options.offset || 0;
    const limit = options.limit || 50;
    return notifications.slice(offset, offset + limit);
  }

  /**
   * Marquer une notification comme lue
   */
  async markAsRead(notificationId: string, userId: number): Promise<boolean> {
    const notification = this.notifications.get(notificationId);

    if (!notification || notification.userId !== userId) {
      return false;
    }

    notification.status = NotificationStatus.READ;
    notification.readAt = new Date();

    this.logger.debug(
      `Notification ${notificationId} marked as read for user ${userId}`,
    );
    return true;
  }

  /**
   * Marquer toutes les notifications d'un utilisateur comme lues
   */
  async markAllAsRead(userId: number): Promise<number> {
    const userNotificationIds = this.userNotifications.get(userId) || [];
    let markedCount = 0;

    for (const notificationId of userNotificationIds) {
      const notification = this.notifications.get(notificationId);
      if (notification && notification.status !== NotificationStatus.READ) {
        notification.status = NotificationStatus.READ;
        notification.readAt = new Date();
        markedCount++;
      }
    }

    this.logger.debug(
      `Marked ${markedCount} notifications as read for user ${userId}`,
    );
    return markedCount;
  }

  /**
   * Supprimer une notification
   */
  async deleteNotification(
    notificationId: string,
    userId: number,
  ): Promise<boolean> {
    const notification = this.notifications.get(notificationId);

    if (!notification || notification.userId !== userId) {
      return false;
    }

    // Supprimer de la map principale
    this.notifications.delete(notificationId);

    // Supprimer de la liste utilisateur
    const userNotificationIds = this.userNotifications.get(userId) || [];
    const updatedIds = userNotificationIds.filter(
      (id) => id !== notificationId,
    );
    this.userNotifications.set(userId, updatedIds);

    this.logger.debug(
      `Notification ${notificationId} deleted for user ${userId}`,
    );
    return true;
  }

  /**
   * Obtenir le nombre de notifications non lues
   */
  async getUnreadCount(userId: number): Promise<number> {
    const userNotificationIds = this.userNotifications.get(userId) || [];
    return userNotificationIds
      .map((id) => this.notifications.get(id))
      .filter((n) => n && n.status !== NotificationStatus.READ).length;
  }

  private storeNotification(notification: InAppNotification): void {
    // Stocker dans la map principale
    this.notifications.set(notification.id, notification);

    // Ajouter à la liste utilisateur
    const userNotificationIds =
      this.userNotifications.get(notification.userId) || [];
    userNotificationIds.push(notification.id);
    this.userNotifications.set(notification.userId, userNotificationIds);

    // TODO: Persister en base de données pour la production
    // await this.notificationRepository.save(notification);
  }

  private emitNotificationEvent(notification: InAppNotification): void {
    // TODO: Émettre un événement WebSocket/SSE
    // this.eventEmitter.emit('notification.created', {
    //   userId: notification.userId,
    //   notification,
    // });

    this.logger.debug(`Event emitted for notification ${notification.id}`);
  }

  private generateNotificationId(): string {
    return `inapp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultExpirationDate(): Date {
    const days = this.configService.get('NOTIFICATION_RETENTION_DAYS', 30);
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + days);
    return expirationDate;
  }

  private initializeProvider(): void {
    try {
      this._isEnabled = true;
      this.logger.log('Push In-App provider initialized successfully');

      // Nettoyer les notifications expirées périodiquement
      setInterval(
        () => {
          this.cleanupExpiredNotifications();
        },
        60 * 60 * 1000,
      ); // Toutes les heures
    } catch (error) {
      this.logger.error('Failed to initialize Push In-App provider', error);
      this._isEnabled = false;
    }
  }

  private cleanupExpiredNotifications(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [notificationId, notification] of this.notifications.entries()) {
      if (notification.expiresAt && notification.expiresAt < now) {
        // Supprimer de la map principale
        this.notifications.delete(notificationId);

        // Supprimer de la liste utilisateur
        const userNotificationIds =
          this.userNotifications.get(notification.userId) || [];
        const updatedIds = userNotificationIds.filter(
          (id) => id !== notificationId,
        );
        this.userNotifications.set(notification.userId, updatedIds);

        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired notifications`);
    }
  }
}
