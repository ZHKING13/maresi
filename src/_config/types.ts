export enum NODE_ENV_MODES {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
}

export enum CONFIG_NAME_SPACED {
  APP_ENV = 'appenv',
  JWT_AND_PASSPORT = 'jwtandpassportenv',
  DATABASE = 'databaseenv',
  EMAIL = 'emailenv',
  MINIO = 'minioenv',
  SMS = 'smsenv',
  NOTIFICATION = 'notificationenv',
  PAYMENT = 'paymentenv',
}

export enum CUSTOM_PROVIDERS_INJECTION_TOKENS {
  APP_SETTINGS = 'APP_SETTINGS',
  JWT_AND_PASSPORT = 'JWT_AND_PASSPORT',
  DATABASE = 'databaseenv',
  EMAIL = 'emailenv',
}

export interface IAppEnvConfig {
  frontendBaseUrl: string;
  port: number;
  nodeEnv: string;
}

export interface IJwtAndPassportEnvConfig {
  jwtSecret: string;
  jwtRefreshSecret: string;
  verifyEmailSecret: string;
  accessTokenExpiresIn: number;
  jwtVerifyEmailTokenExpirationTime: number;
  refreshTokenExpiresIn: number;
}

export interface IDatabaseEnvConfig {
  databaseUrl: string;
}

export interface IEmailEnvConfig {
  resendApiKey: string;
  mailerAddress: string;
}

export interface IMinioEnvConfig {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
}

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
      accountSid: string;
      authToken: string;
      fromNumber: string;
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

export interface IPaymentEnvConfig {
  cinetpay: {
    enabled: boolean;
    apiKey: string;
    siteId: string;
    secretKey: string;
    baseUrl: string;
    version: string;
    webhookSecret: string;
    returnBaseUrl: string;
    notifyBaseUrl: string;
  };
  // Pour futurs providers
  stripe?: {
    enabled: boolean;
    publicKey: string;
    secretKey: string;
    webhookSecret: string;
  };
}

export interface IConfigNameSpacedEnvFactory {
  app: () => IAppEnvConfig;
  jwtAndPassport: () => IJwtAndPassportEnvConfig;
  database: () => IDatabaseEnvConfig;
  email: () => IEmailEnvConfig;
  minio: () => IMinioEnvConfig;
  notification: () => INotificationEnvConfig;
  payment: () => IPaymentEnvConfig;
}
