import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  INotificationProvider,
  INotificationPayload,
  INotificationResult,
  INotificationRecipient,
  INotificationData,
  NotificationType,
} from '../interfaces/notification.interface';
import { NotificationTemplateService } from '../templates/notification-template.service';

@Injectable()
export class SmsNotificationProvider implements INotificationProvider {
  readonly type = NotificationType.SMS;
  private readonly logger = new Logger(SmsNotificationProvider.name);
  private _isEnabled: boolean = false;
  private smsConfig: any;

  constructor(
    private configService: ConfigService,
    private templateService: NotificationTemplateService,
  ) {
    this.initializeProvider();
  }

  get isEnabled(): boolean {
    return this._isEnabled;
  }

  async send(payload: INotificationPayload): Promise<INotificationResult> {
    if (!this.isEnabled) {
      throw new Error('SMS provider is not enabled');
    }

    try {
      const results: INotificationResult[] = [];

      for (const recipient of payload.recipients) {
        if (!this.validateRecipient(recipient)) {
          results.push({
            success: false,
            error: `Invalid phone number: ${recipient.phoneNumber}`,
          });
          continue;
        }

        const formattedMessage = await this.formatMessage(
          payload.data,
          recipient,
        );

        try {
          // Simuler l'envoi SMS pour l'instant (remplacer par l'implémentation réelle)
          const result = await this.sendSms(
            recipient.phoneNumber!,
            formattedMessage,
          );

          results.push({
            success: true,
            messageId: result.messageId || `sms_${Date.now()}`,
            deliveredAt: new Date(),
            metadata: {
              recipient: recipient.phoneNumber,
              provider: this.smsConfig?.provider || 'simulated',
            },
          });

          this.logger.debug(
            `SMS sent successfully to ${recipient.phoneNumber}`,
          );
        } catch (error) {
          results.push({
            success: false,
            error: `Failed to send SMS to ${recipient.phoneNumber}: ${error.message}`,
          });
          this.logger.error(
            `Failed to send SMS to ${recipient.phoneNumber}`,
            error,
          );
        }
      }

      return results[0] || { success: false, error: 'No recipients processed' };
    } catch (error) {
      this.logger.error('Error in SMS provider send method', error);
      return {
        success: false,
        error: `SMS provider error: ${error.message}`,
      };
    }
  }

  validateRecipient(recipient: INotificationRecipient): boolean {
    return !!(
      recipient.phoneNumber && this.isValidPhoneNumber(recipient.phoneNumber)
    );
  }

  async formatMessage(
    data: INotificationData,
    recipient: INotificationRecipient,
  ): Promise<string> {
    try {
      if (data.templateId) {
        // Utiliser un template
        const variables = {
          ...data.variables,
          recipientName: recipient.name,
          recipientPhone: recipient.phoneNumber,
        };

        const compiled = this.templateService.compileTemplate(
          data.templateId,
          variables,
        );
        return compiled.content;
      } else {
        // Utiliser le contenu brut
        return data.content;
      }
    } catch (error) {
      this.logger.error('Error formatting SMS message', error);
      return data.content; // Fallback au contenu brut
    }
  }

  private async sendSms(
    phoneNumber: string,
    message: string,
  ): Promise<{ messageId?: string }> {
    // Implémentation simulée - remplacer par le vrai provider
    if (this.smsConfig?.provider === 'twilio') {
      return this.sendWithTwilio(phoneNumber, message);
    } else if (this.smsConfig?.provider === 'vonage') {
      return this.sendWithVonage(phoneNumber, message);
    } else {
      // Simulation pour le développement
      this.logger.debug(
        `[SIMULATED SMS] To: ${phoneNumber}, Message: ${message}`,
      );
      return { messageId: `sim_${Date.now()}` };
    }
  }

  private async sendWithTwilio(
    phoneNumber: string,
    message: string,
  ): Promise<{ messageId: string }> {
    // TODO: Implémenter avec Twilio SDK
    /*
    const twilio = require('twilio');
    const client = twilio(this.smsConfig.accountSid, this.smsConfig.authToken);
    
    const result = await client.messages.create({
      body: message,
      from: this.smsConfig.fromNumber,
      to: phoneNumber
    });
    
    return { messageId: result.sid };
    */

    this.logger.debug(`[TWILIO SMS] To: ${phoneNumber}, Message: ${message}`);
    return { messageId: `twilio_${Date.now()}` };
  }

  private async sendWithVonage(
    phoneNumber: string,
    message: string,
  ): Promise<{ messageId: string }> {
    // TODO: Implémenter avec Vonage SDK
    /*
    const Vonage = require('@vonage/server-sdk');
    const vonage = new Vonage({
      apiKey: this.smsConfig.apiKey,
      apiSecret: this.smsConfig.apiSecret
    });
    
    const result = await vonage.sms.send({
      to: phoneNumber,
      from: this.smsConfig.fromNumber,
      text: message
    });
    
    return { messageId: result.messages[0]['message-id'] };
    */

    this.logger.debug(`[VONAGE SMS] To: ${phoneNumber}, Message: ${message}`);
    return { messageId: `vonage_${Date.now()}` };
  }

  private initializeProvider(): void {
    try {
      this.smsConfig = this.configService.get('SMS');

      if (!this.smsConfig || !this.smsConfig.enabled) {
        this.logger.warn('SMS configuration not found or disabled');
        return;
      }

      this._isEnabled = true;
      this.logger.log(
        `SMS provider initialized with ${this.smsConfig.provider || 'simulation'}`,
      );
    } catch (error) {
      this.logger.error('Failed to initialize SMS provider', error);
      this._isEnabled = false;
    }
  }

  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Validation basique - améliorer selon les besoins
    const phoneRegex = /^\+?[\d\s\-\(\)]{8,15}$/;
    return phoneRegex.test(phoneNumber.replace(/\s/g, ''));
  }
}
