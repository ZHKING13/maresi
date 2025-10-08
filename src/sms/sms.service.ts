import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CONFIG_NAME_SPACED } from 'src/_config/types';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Envoie un code de vérification par SMS
   * @param phoneNumber Le numéro de téléphone du destinataire
   * @param code Le code de vérification
   * @returns Une promesse qui se résout avec les informations d'envoi
   */
  async sendVerificationCode(phoneNumber: string, code: string): Promise<any> {
    const config = this.configService.get(CONFIG_NAME_SPACED.SMS);
    if (!config) {
      this.logger.error('SMS config not found');
      throw new Error('SMS config not found');
    }

    try {
      // TODO: Intégrer avec un fournisseur réel de SMS
      // Pour l'instant, nous simulons simplement l'envoi
      this.logger.debug(
        `[SIMULATED] SMS sent to ${phoneNumber} with code ${code}`,
      );

      // Remplacer par l'implémentation réelle avec un fournisseur de SMS
      // Exemples: Twilio, Vonage (ancien Nexmo), AWS SNS, etc.
      /*
      const twilioClient = require('twilio')(config.accountSid, config.authToken);
      const result = await twilioClient.messages.create({
        body: `Votre code de vérification est: ${code}. Ce code expirera dans 10 minutes.`,
        from: config.fromNumber,
        to: phoneNumber
      });
      return result;
      */

      return {
        success: true,
        message: `SMS successfully sent to ${phoneNumber}`,
      };
    } catch (error) {
      this.logger.error(`Error sending SMS: ${error.message}`);
      throw error;
    }
  }
}
