import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import handlebars from 'handlebars';
import nodemailer from 'nodemailer';
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
export class EmailNotificationProvider implements INotificationProvider {
  readonly type = NotificationType.EMAIL;
  private readonly logger = new Logger(EmailNotificationProvider.name);
  private transporter: nodemailer.Transporter;
  private _isEnabled: boolean = false;

  constructor(
    private configService: ConfigService,
    private templateService: NotificationTemplateService,
  ) {
    this.initializeTransporter();
  }

  get isEnabled(): boolean {
    return this._isEnabled;
  }

  async send(payload: INotificationPayload): Promise<INotificationResult> {
    if (!this.isEnabled) {
      throw new Error('Email provider is not enabled');
    }

    try {
      const results: INotificationResult[] = [];

      for (const recipient of payload.recipients) {
        if (!this.validateRecipient(recipient)) {
          results.push({
            success: false,
            error: `Invalid email recipient: ${recipient.email}`,
          });
          continue;
        }

        const formattedMessage = await this.formatMessage(
          payload.data,
          recipient,
        );
        const subject = payload.data.subject || 'Notification';

        const mailOptions = {
          from: this.configService.get('EMAIL_FROM'),
          to: recipient.email,
          subject,
          html: formattedMessage,
          attachments: payload.data.attachments?.map((att) => ({
            filename: att.filename,
            content: att.content,
            contentType: att.contentType,
          })),
        };

        try {
          const info = await this.transporter.sendMail(mailOptions);
          results.push({
            success: true,
            messageId: info.messageId,
            deliveredAt: new Date(),
            metadata: {
              recipient: recipient.email,
              messageId: info.messageId,
              response: info.response,
            },
          });

          this.logger.debug(
            `Email sent successfully to ${recipient.email}: ${info.messageId}`,
          );
        } catch (error) {
          results.push({
            success: false,
            error: `Failed to send email to ${recipient.email}: ${error.message}`,
          });
          this.logger.error(
            `Failed to send email to ${recipient.email}`,
            error,
          );
        }
      }

      // Retourner le premier résultat ou un résumé
      return results[0] || { success: false, error: 'No recipients processed' };
    } catch (error) {
      this.logger.error('Error in email provider send method', error);
      return {
        success: false,
        error: `Email provider error: ${error.message}`,
      };
    }
  }

  validateRecipient(recipient: INotificationRecipient): boolean {
    return !!(recipient.email && this.isValidEmail(recipient.email));
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
          recipientEmail: recipient.email,
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
      this.logger.error('Error formatting email message', error);
      return data.content; // Fallback au contenu brut
    }
  }

  private initializeTransporter(): void {
    try {
      const emailConfig = this.configService.get('EMAIL');

      if (!emailConfig || !emailConfig.host) {
        this.logger.warn('Email configuration not found or incomplete');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: emailConfig.host,
        port: emailConfig.port || 587,
        secure: emailConfig.secure || false,
        auth: {
          user: emailConfig.user,
          pass: emailConfig.password,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      this._isEnabled = true;
      this.logger.log('Email transporter initialized successfully');

      // Vérifier la connexion
      this.transporter.verify((error) => {
        if (error) {
          this.logger.error('Email transporter verification failed', error);
          this._isEnabled = false;
        } else {
          this.logger.log('Email transporter verified successfully');
        }
      });
    } catch (error) {
      this.logger.error('Failed to initialize email transporter', error);
      this._isEnabled = false;
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
