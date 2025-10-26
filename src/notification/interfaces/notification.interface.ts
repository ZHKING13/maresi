export enum NotificationType {
  EMAIL = 'email',
  SMS = 'sms',
  FCM = 'fcm',
  PUSH_IN_APP = 'push_in_app',
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  READ = 'read',
}

export interface INotificationRecipient {
  id?: string;
  email?: string;
  phoneNumber?: string;
  fcmToken?: string;
  userId?: number;
  name?: string;
}

export interface INotificationAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  path?: string;
}

export interface INotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  subject?: string;
  content: string;
  variables?: string[];
}

export interface INotificationData {
  templateId?: string;
  subject?: string;
  content: string;
  variables?: Record<string, any>;
  attachments?: INotificationAttachment[];
  metadata?: Record<string, any>;
}

export interface INotificationPayload {
  type: NotificationType;
  recipients: INotificationRecipient[];
  data: INotificationData;
  priority?: NotificationPriority;
  scheduledAt?: Date;
  expiresAt?: Date;
  retryCount?: number;
  maxRetries?: number;
}

export interface INotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  deliveredAt?: Date;
  metadata?: Record<string, any>;
}

export interface INotificationProvider {
  readonly type: NotificationType;
  readonly isEnabled: boolean;

  send(payload: INotificationPayload): Promise<INotificationResult>;
  validateRecipient(recipient: INotificationRecipient): boolean;
  formatMessage(
    data: INotificationData,
    recipient: INotificationRecipient,
  ): Promise<string>;
}

export interface INotificationConfig {
  email?: {
    enabled: boolean;
    provider: 'nodemailer' | 'sendgrid' | 'ses';
    config: Record<string, any>;
  };
  sms?: {
    enabled: boolean;
    provider: 'twilio' | 'vonage' | 'aws-sns';
    config: Record<string, any>;
  };
  fcm?: {
    enabled: boolean;
    serviceAccountPath?: string;
    projectId?: string;
  };
  pushInApp?: {
    enabled: boolean;
    maxRetentionDays?: number;
  };
  logging?: {
    enabled: boolean;
    retentionDays: number;
    cleanupInterval: number; // en heures
  };
}

// Interfaces pour le logging des notifications
export interface INotificationLog {
  id: string;
  type: NotificationType;
  status: NotificationStatus;
  priority: NotificationPriority;

  // Recipient info
  recipientUserId?: number;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;

  // Notification content
  subject?: string;
  content: string;
  templateId?: string;
  variables?: Record<string, any>;

  // Provider response
  messageId?: string;
  providerResponse?: Record<string, any>;
  errorMessage?: string;

  // Timestamps
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  expiresAt?: Date;

  // Metadata
  metadata?: Record<string, any>;
  retryCount: number;
  maxRetries: number;

  created: Date;
  updated: Date;
}

export interface INotificationLogQuery {
  userId?: number;
  type?: NotificationType;
  status?: NotificationStatus;
  priority?: NotificationPriority;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'created' | 'sentAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface INotificationLogStats {
  total: number;
  byType: Record<NotificationType, number>;
  byStatus: Record<NotificationStatus, number>;
  byPriority: Record<NotificationPriority, number>;
  successRate: number;
  averageDeliveryTime?: number; // en minutes
}

export interface INotificationSettings {
  id: number;
  key: string;
  value: string;
  description?: string;
  category: string;
  isEditable: boolean;
  created: Date;
  updated: Date;
}

export interface IRetentionSettings {
  logRetentionDays: number;
  cleanupInterval: number; // en heures
  archiveOldLogs: boolean;
  archiveAfterDays?: number;
}
