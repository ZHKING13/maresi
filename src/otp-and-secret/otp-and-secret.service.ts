import { Injectable } from '@nestjs/common';
import { OtpAndSecretClient } from './otp-and-secret.client';
import { OTPAndSecret } from '@prisma/client';

@Injectable()
export class OtpAndSecretService {
  constructor(private readonly optAndSecretClient: OtpAndSecretClient) {}

  // Get OTPAndSecret by contact
  public async getOTPAndSecretByContact({
    contact,
  }: Pick<OTPAndSecret, 'contact'>): Promise<OTPAndSecret | null> {
    return this.optAndSecretClient.getOTPAndSecretByContact({
      contact,
    });
  }

  // Create or update OtpAndSecret or throw
  public async createOrUpdateOtpAndSecretOrThrow(
    { contact, secret }: Pick<OTPAndSecret, 'contact' | 'secret'>,
    {
      shouldIncremnetRequestSecretCounter = false,
      shouldResetRequestSecretCounter = false,
      shouldResetRequestSecretCounterToFirstTry = false,
      shouldIncremnetOtpCodeRetryCounter = false,
      shouldResetOtpCodeRetryCounter = false,
    }: {
      shouldIncremnetRequestSecretCounter: boolean;
      shouldResetRequestSecretCounter: boolean;
      shouldResetRequestSecretCounterToFirstTry: boolean;
      shouldIncremnetOtpCodeRetryCounter: boolean;
      shouldResetOtpCodeRetryCounter: boolean;
    },
  ): Promise<void> {
    return this.optAndSecretClient.createOrUpdateOtpAndSecretOrThrow(
      {
        contact,
        secret,
      },
      {
        shouldIncremnetOtpCodeRetryCounter,
        shouldIncremnetRequestSecretCounter,
        shouldResetOtpCodeRetryCounter,
        shouldResetRequestSecretCounter,
        shouldResetRequestSecretCounterToFirstTry,
      },
    );
  }
}
