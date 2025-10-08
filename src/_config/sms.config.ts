import { ConfigType, registerAs } from '@nestjs/config';

export const smsConfig = registerAs('SMS', () => ({
  enabled: process.env.SMS_ENABLED === 'true' || false,
  // Twilio credentials
  accountSid: process.env.TWILIO_ACCOUNT_SID || '',
  authToken: process.env.TWILIO_AUTH_TOKEN || '',
  fromNumber: process.env.TWILIO_FROM_NUMBER || '',
  // Vonage (Nexmo) credentials
  // apiKey: process.env.VONAGE_API_KEY || '',
  // apiSecret: process.env.VONAGE_API_SECRET || '',
}));

export type SmsConfigType = ConfigType<typeof smsConfig>;
