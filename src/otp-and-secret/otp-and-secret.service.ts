import { Injectable } from '@nestjs/common';
import { OtpAndSecretClient } from './otp-and-secret.client';
import { OTPAndSecret } from '@prisma/client';

@Injectable()
export class OtpAndSecretService {
  constructor(private readonly optAndSecretClient: OtpAndSecretClient) {}

  // Get OTPAndSecret by phoneNumber
  public async getOTPAndSecretByMsisdn({
    phoneNumber,
  }: Pick<OTPAndSecret, 'phoneNumber'>): Promise<OTPAndSecret | null> {
    return this.optAndSecretClient.getOTPAndSecretBySMS({
      phoneNumber,
    });
  }

  // Create or update OtpAndSecret or throw
  public async createOrUpdateOtpAndSecretOrThrow(
    { phoneNumber, secret }: Pick<OTPAndSecret, 'phoneNumber' | 'secret'>,
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
        phoneNumber,
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
