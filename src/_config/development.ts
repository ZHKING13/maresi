import {
  IAppEnvConfig,
  IConfigNameSpacedEnvFactory,
  IJwtAndPassportEnvConfig,
  IDatabaseEnvConfig,
  IEmailEnvConfig,
  IMinioEnvConfig,
  INotificationEnvConfig,
  IPaymentEnvConfig,
} from './types';
import { notificationConfig } from './notification.config';

const defaultExpiresIn = 604800;

export const developmentModeEnv: IConfigNameSpacedEnvFactory = {
  app: (): IAppEnvConfig => ({
    frontendBaseUrl: process.env.FRONTEND_BASE_URL!,
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV!,
  }),

  jwtAndPassport: (): IJwtAndPassportEnvConfig => ({
    jwtSecret: process.env.JWT_SECRET!,
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET!,
    verifyEmailSecret: process.env.VERIFY_EMAIL_SECRET!,
    accessTokenExpiresIn: parseInt(
      process.env.ACCESS_TOKEN_EXPIRES_IN || `${defaultExpiresIn}`,
    ),
    jwtVerifyEmailTokenExpirationTime: parseInt(
      process.env.JWT_VERIFY_EMAIL_TOKEN_EXPIRATION_TIME || '3600',
    ),
    refreshTokenExpiresIn: parseInt(
      process.env.REFRESH_TOKEN_EXPIRES_IN || '1209600',
    ),
  }),

  database: (): IDatabaseEnvConfig => ({
    databaseUrl: process.env.DATABASE_URL!,
  }),

  email: (): IEmailEnvConfig => ({
    resendApiKey: process.env.RESEND_API_KEY!,
    mailerAddress: process.env.MAILER_ADDRESS!,
  }),

  minio: (): IMinioEnvConfig => ({
    endPoint: process.env.MINIO_ENDPOINT ?? '127.0.0.1',
    port: Number(process.env.MINIO_PORT) || 9000,
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
  }),

  notification: notificationConfig,

  payment: (): IPaymentEnvConfig => ({
    cinetpay: {
      enabled: process.env.CINETPAY_ENABLED === 'true',
      apiKey: process.env.CINETPAY_API_KEY || '',
      siteId: process.env.CINETPAY_SITE_ID || '',
      secretKey: process.env.CINETPAY_SECRET_KEY || '',
      baseUrl:
        process.env.CINETPAY_BASE_URL || 'https://api-checkout.cinetpay.com',
      version: process.env.CINETPAY_VERSION || 'v2',
      webhookSecret: process.env.CINETPAY_WEBHOOK_SECRET || '',
      returnBaseUrl:
        process.env.CINETPAY_RETURN_BASE_URL ||
        process.env.FRONTEND_BASE_URL ||
        'http://localhost:3001',
      notifyBaseUrl:
        process.env.CINETPAY_NOTIFY_BASE_URL ||
        process.env.BACKEND_BASE_URL ||
        'http://localhost:3000',
    },
  }),
};
