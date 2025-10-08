export * from './notification.interface';

// Types pour les notifications in-app
export interface InAppNotification {
  id: string;
  userId: number;
  title: string;
  content: string;
  type: string;
  status: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  readAt?: Date;
  expiresAt?: Date;
}

export interface InAppNotificationOptions {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
  type?: string;
}
