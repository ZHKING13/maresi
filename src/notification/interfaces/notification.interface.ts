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
}
