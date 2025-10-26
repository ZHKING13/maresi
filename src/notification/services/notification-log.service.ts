import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import {
  INotificationLog,
  INotificationLogQuery,
  INotificationLogStats,
  INotificationSettings,
  IRetentionSettings,
  NotificationType,
  NotificationStatus,
  NotificationPriority,
  INotificationPayload,
  INotificationResult,
} from '../interfaces/notification.interface';

@Injectable()
export class NotificationLogService implements OnModuleInit {
  private readonly logger = new Logger(NotificationLogService.name);
  private retentionSettings: IRetentionSettings = {
    logRetentionDays: 90,
    cleanupInterval: 24, // heures
    archiveOldLogs: false,
  };

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.loadRetentionSettings();
    this.logger.log(
      `NotificationLogService initialized with ${this.retentionSettings.logRetentionDays} days retention`,
    );
  }

  /**
   * Créer un log de notification
   */
  async createLog(
    payload: INotificationPayload,
    result?: INotificationResult,
  ): Promise<INotificationLog> {
    const recipient = payload.recipients[0];

    // Construire l'objet de données en ne définissant que les champs avec valeurs
    const logData: any = {
      type: payload.type,
      status: result?.success
        ? NotificationStatus.SENT
        : NotificationStatus.FAILED,
      priority: payload.priority || NotificationPriority.MEDIUM,

      // Content (requis)
      content: payload.data.content,

      // Metadata et compteurs
      variables: payload.data.variables || {},
      metadata: payload.data.metadata || {},
      retryCount: payload.retryCount || 0,
      maxRetries: payload.maxRetries || 3,
    };

    // Ajouter les champs optionnels seulement s'ils ont une valeur
    if (recipient?.userId) logData.recipientUserId = recipient.userId;
    if (recipient?.email) logData.recipientEmail = recipient.email;
    if (recipient?.phoneNumber) logData.recipientPhone = recipient.phoneNumber;
    if (recipient?.name) logData.recipientName = recipient.name;

    if (payload.data.subject) logData.subject = payload.data.subject;
    if (payload.data.templateId) logData.templateId = payload.data.templateId;

    if (result?.messageId) logData.messageId = result.messageId;
    if (result?.metadata) logData.providerResponse = result.metadata;
    if (result?.error) logData.errorMessage = result.error;

    if (payload.scheduledAt) logData.scheduledAt = payload.scheduledAt;
    if (result?.success && result.deliveredAt)
      logData.sentAt = result.deliveredAt;
    if (result?.deliveredAt) logData.deliveredAt = result.deliveredAt;
    if (payload.expiresAt) logData.expiresAt = payload.expiresAt;

    const savedLog = await this.prisma.notificationLog.create({
      data: logData,
      include: {
        user: true,
      },
    });

    this.logger.debug(
      `Created notification log ${savedLog.id} for ${payload.type}`,
    );
      let log = await this.prisma.notificationLog.create({
        data: logData,
      });
    return this.mapToInterface(log);
  }

  /**
   * Mettre à jour le statut d'un log
   */
  async updateLogStatus(
    logId: string,
    status: NotificationStatus,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const updateData: any = {
      status,
      updated: new Date(),
    };

    // Mettre à jour les timestamps selon le statut
    switch (status) {
      case NotificationStatus.SENT:
        updateData.sentAt = new Date();
        break;
      case NotificationStatus.DELIVERED:
        updateData.deliveredAt = new Date();
        break;
      case NotificationStatus.READ:
        updateData.readAt = new Date();
        break;
    }

    if (metadata) {
      updateData.providerResponse = metadata;
    }

    await this.prisma.notificationLog.update({
      where: { id: logId },
      data: updateData,
    });

    this.logger.debug(`Updated log ${logId} status to ${status}`);
  }

  /**
   * Récupérer les logs avec filtres
   */
  async getLogs(query: INotificationLogQuery): Promise<{
    logs: INotificationLog[];
    total: number;
  }> {
    const where: any = {};

    if (query.userId) where.recipientUserId = query.userId;
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;

    if (query.startDate || query.endDate) {
      where.created = {};
      if (query.startDate) where.created.gte = query.startDate;
      if (query.endDate) where.created.lte = query.endDate;
    }

    const orderBy: any = {};
    const sortField = query.sortBy || 'created';
    const sortOrder = query.sortOrder || 'desc';
    orderBy[sortField] = sortOrder;

    const [logs, total] = await Promise.all([
      this.prisma.notificationLog.findMany({
        where,
        orderBy,
        take: query.limit || 50,
        skip: query.offset || 0,
        include: { user: true },
      }),
      this.prisma.notificationLog.count({ where }),
    ]);

    return {
      logs: logs.map((log) => this.mapToInterface(log)),
      total,
    };
  }

  /**
   * Obtenir les statistiques des notifications
   */
  async getStats(
    startDate?: Date,
    endDate?: Date,
  ): Promise<INotificationLogStats> {
    const where: any = {};
    if (startDate || endDate) {
      where.created = {};
      if (startDate) where.created.gte = startDate;
      if (endDate) where.created.lte = endDate;
    }

    // Compter par type
    const byTypeResults = await this.prisma.notificationLog.groupBy({
      by: ['type'],
      where,
      _count: true,
    });

    // Compter par statut
    const byStatusResults = await this.prisma.notificationLog.groupBy({
      by: ['status'],
      where,
      _count: true,
    });

    // Compter par priorité
    const byPriorityResults = await this.prisma.notificationLog.groupBy({
      by: ['priority'],
      where,
      _count: true,
    });

    // Total et taux de succès
    const total = byTypeResults.reduce((sum, item) => sum + item._count, 0);
    const successCount = byStatusResults
      .filter((item) =>
        [NotificationStatus.SENT, NotificationStatus.DELIVERED].includes(
          item.status as NotificationStatus,
        ),
      )
      .reduce((sum, item) => sum + item._count, 0);

    // Temps moyen de livraison
    const deliveredLogs = await this.prisma.notificationLog.findMany({
      where: {
        ...where,
        status: NotificationStatus.DELIVERED,
        sentAt: { not: null },
        deliveredAt: { not: null },
      },
      select: {
        sentAt: true,
        deliveredAt: true,
      },
    });

    let averageDeliveryTime: number | undefined;
    if (deliveredLogs.length > 0) {
      const totalDeliveryTime = deliveredLogs.reduce((sum, log) => {
        const sentTime = log.sentAt!.getTime();
        const deliveredTime = log.deliveredAt!.getTime();
        return sum + (deliveredTime - sentTime);
      }, 0);
      averageDeliveryTime = Math.round(
        totalDeliveryTime / deliveredLogs.length / (1000 * 60),
      ); // en minutes
    }

    return {
      total,
      byType: this.arrayToRecord(byTypeResults, 'type'),
      byStatus: this.arrayToRecord(byStatusResults, 'status'),
      byPriority: this.arrayToRecord(byPriorityResults, 'priority'),
      successRate: total > 0 ? Math.round((successCount / total) * 100) : 0,
      averageDeliveryTime,
    };
  }

  /**
   * Nettoyer les anciens logs (tâche cron)
   */
  async cleanupOldLogs(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(
      cutoffDate.getDate() - this.retentionSettings.logRetentionDays,
    );

    const deletedCount = await this.prisma.notificationLog.deleteMany({
      where: {
        created: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(
      `Cleaned up ${deletedCount.count} notification logs older than ${this.retentionSettings.logRetentionDays} days`,
    );
  }

  /**
   * Gestion des paramètres de rétention
   */
  async getRetentionSettings(): Promise<IRetentionSettings> {
    return this.retentionSettings;
  }

  async updateRetentionSettings(
    settings: Partial<IRetentionSettings>,
  ): Promise<IRetentionSettings> {
    this.retentionSettings = { ...this.retentionSettings, ...settings };

    // Sauvegarder en base
    await this.saveRetentionSettings();

    this.logger.log(
      `Updated retention settings: ${JSON.stringify(this.retentionSettings)}`,
    );
    return this.retentionSettings;
  }

  /**
   * Gestion des paramètres généraux
   */
  async getSetting(key: string): Promise<INotificationSettings | null> {
    const setting = await this.prisma.notificationSettings.findUnique({
      where: { key },
    });

    if (!setting) {
      return null;
    }

    return {
      id: setting.id,
      key: setting.key,
      value: setting.value,
      description:
        setting.description !== null ? setting.description : undefined,
      category: setting.category,
      isEditable: setting.isEditable,
      created: setting.created,
      updated: setting.updated,
    };
  }

  async setSetting(
    key: string,
    value: string,
    description?: string,
    category = 'general',
  ): Promise<INotificationSettings> {
    const setting = await this.prisma.notificationSettings.upsert({
      where: { key },
      update: {
        value,
        description,
        category,
        updated: new Date(),
      },
      create: {
        key,
        value,
        description,
        category,
        isEditable: true,
      },
    });
    return {
      id: setting.id,
      key: setting.key,
      value: setting.value,
      description:
        setting.description !== null ? setting.description : undefined,
      category: setting.category,
      isEditable: setting.isEditable,
      created: setting.created,
      updated: setting.updated,
    };
  }

  async getAllSettings(category?: string): Promise<INotificationSettings[]> {
    const where = category ? { category } : {};
    const settings = await this.prisma.notificationSettings.findMany({
      where,
      orderBy: { key: 'asc' },
    });

    return settings.map((setting) => ({
      id: setting.id,
      key: setting.key,
      value: setting.value,
      description:
        setting.description !== null ? setting.description : undefined,
      category: setting.category,
      isEditable: setting.isEditable,
      created: setting.created,
      updated: setting.updated,
    }));
  }

  /**
   * Méthodes privées
   */
  private async loadRetentionSettings(): Promise<void> {
    try {
      const settings = await this.getAllSettings('retention');

      for (const setting of settings) {
        switch (setting.key) {
          case 'log_retention_days':
            this.retentionSettings.logRetentionDays = parseInt(setting.value);
            break;
          case 'cleanup_interval':
            this.retentionSettings.cleanupInterval = parseInt(setting.value);
            break;
          case 'archive_old_logs':
            this.retentionSettings.archiveOldLogs = setting.value === 'true';
            break;
          case 'archive_after_days':
            this.retentionSettings.archiveAfterDays = parseInt(setting.value);
            break;
        }
      }
    } catch (error) {
      this.logger.warn('Could not load retention settings, using defaults');
    }
  }

  private async saveRetentionSettings(): Promise<void> {
    const settings = [
      {
        key: 'log_retention_days',
        value: this.retentionSettings.logRetentionDays.toString(),
      },
      {
        key: 'cleanup_interval',
        value: this.retentionSettings.cleanupInterval.toString(),
      },
      {
        key: 'archive_old_logs',
        value: this.retentionSettings.archiveOldLogs.toString(),
      },
    ];

    if (this.retentionSettings.archiveAfterDays) {
      settings.push({
        key: 'archive_after_days',
        value: this.retentionSettings.archiveAfterDays.toString(),
      });
    }

    for (const setting of settings) {
      await this.setSetting(setting.key, setting.value, undefined, 'retention');
    }
  }

  private mapToInterface(log: any): INotificationLog {
    return {
      id: log.id,
      type: log.type,
      status: log.status,
      priority: log.priority,
      recipientUserId: log.recipientUserId,
      recipientEmail: log.recipientEmail,
      recipientPhone: log.recipientPhone,
      recipientName: log.recipientName,
      subject: log.subject,
      content: log.content,
      templateId: log.templateId,
      variables: log.variables,
      messageId: log.messageId,
      providerResponse: log.providerResponse,
      errorMessage: log.errorMessage,
      scheduledAt: log.scheduledAt,
      sentAt: log.sentAt,
      deliveredAt: log.deliveredAt,
      readAt: log.readAt,
      expiresAt: log.expiresAt,
      metadata: log.metadata,
      retryCount: log.retryCount,
      maxRetries: log.maxRetries,
      created: log.created,
      updated: log.updated,
    };
  }

  private arrayToRecord(
    array: any[],
    keyField: string,
  ): Record<string, number> {
    return array.reduce((acc, item) => {
      acc[item[keyField]] = item._count;
      return acc;
    }, {});
  }
}
