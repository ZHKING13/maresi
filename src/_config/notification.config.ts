import { registerAs } from '@nestjs/config';

export interface INotificationEnvConfig {
  email: {
    enabled: boolean;
    provider: string;
    config: {
      host: string;
      port: number;
      secure: boolean;
      user: string;
      password: string;
      from: string;
    };
  };
  sms: {
    enabled: boolean;
    provider: string;
    config: {
      // Twilio
      accountSid: string;
      authToken: string;
      fromNumber: string;
      // Vonage
      apiKey: string;
      apiSecret: string;
    };
  };
  fcm: {
    enabled: boolean;
    serviceAccountPath: string;
    projectId: string;
  };
  pushInApp: {
    enabled: boolean;
    maxRetentionDays: number;
  };
}

export const notificationConfig = () => ({
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    provider: process.env.EMAIL_PROVIDER || 'nodemailer',
    config: {
      host: process.env.EMAIL_HOST || 'localhost',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      user: process.env.EMAIL_USER || '',
      password: process.env.EMAIL_PASSWORD || '',
      from: process.env.EMAIL_FROM || 'noreply@localhost',
    },
  },
  sms: {
    enabled: process.env.SMS_ENABLED === 'true',
    provider: process.env.SMS_PROVIDER || 'simulated',
    config: {
      // Twilio
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      fromNumber: process.env.TWILIO_FROM_NUMBER || '',
      // Vonage
      apiKey: process.env.VONAGE_API_KEY || '',
      apiSecret: process.env.VONAGE_API_SECRET || '',
    },
  },
  fcm: {
    enabled: process.env.FCM_ENABLED === 'true',
    serviceAccountPath: process.env.FCM_SERVICE_ACCOUNT_PATH || '',
    projectId: process.env.FCM_PROJECT_ID || '',
  },
  pushInApp: {
    enabled: process.env.PUSH_IN_APP_ENABLED !== 'false', // Activé par défaut
    maxRetentionDays: parseInt(process.env.NOTIFICATION_RETENTION_DAYS || '30'),
  },
});
