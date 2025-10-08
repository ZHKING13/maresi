import { Injectable } from '@nestjs/common';
import { INotificationTemplate } from '../interfaces/notification.interface';
import * as Handlebars from 'handlebars';

@Injectable()
export class NotificationTemplateService {
  private templates: Map<string, INotificationTemplate> = new Map();

  constructor() {
    this.loadDefaultTemplates();
    this.registerHelpers();
  }

  /**
   * Enregistrer un template
   */
  registerTemplate(template: INotificationTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Obtenir un template par ID
   */
  getTemplate(templateId: string): INotificationTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Compiler un template avec des variables
   */
  compileTemplate(
    templateId: string,
    variables: Record<string, any> = {},
  ): { subject?: string; content: string } {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    try {
      const compiledContent = Handlebars.compile(template.content)(variables);
      const compiledSubject = template.subject
        ? Handlebars.compile(template.subject)(variables)
        : undefined;

      return {
        subject: compiledSubject,
        content: compiledContent,
      };
    } catch (error) {
      throw new Error(
        `Error compiling template ${templateId}: ${error.message}`,
      );
    }
  }

  /**
   * Valider les variables d'un template
   */
  validateTemplateVariables(
    templateId: string,
    variables: Record<string, any>,
  ): { isValid: boolean; missingVariables: string[] } {
    const template = this.getTemplate(templateId);
    if (!template) {
      return { isValid: false, missingVariables: [] };
    }

    const missingVariables: string[] = [];

    if (template.variables) {
      for (const variable of template.variables) {
        if (!(variable in variables)) {
          missingVariables.push(variable);
        }
      }
    }

    return {
      isValid: missingVariables.length === 0,
      missingVariables,
    };
  }

  /**
   * Charger les templates par défaut
   */
  private loadDefaultTemplates(): void {
    // Template de vérification email
    this.registerTemplate({
      id: 'email_verification',
      name: 'Vérification Email',
      type: 'email' as any,
      subject: 'Vérifiez votre adresse email - {{appName}}',
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Bonjour {{firstName}} {{lastName}},</h2>
          <p>Merci de vous être inscrit sur {{appName}}. Veuillez cliquer sur le lien ci-dessous pour vérifier votre adresse email :</p>
          <a href="{{verificationLink}}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0;">
            Vérifier mon email
          </a>
          <p>Si vous n'avez pas créé de compte, ignorez ce message.</p>
          <p style="color: #666; font-size: 14px;">Ce lien expire dans {{expirationTime}}.</p>
        </div>
      `,
      variables: [
        'firstName',
        'lastName',
        'appName',
        'verificationLink',
        'expirationTime',
      ],
    });

    // Template OTP par email
    this.registerTemplate({
      id: 'otp_email',
      name: 'Code OTP par Email',
      type: 'email' as any,
      subject: 'Votre code de vérification - {{appName}}',
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Code de vérification</h2>
          <p>Bonjour {{firstName}},</p>
          <p>Votre code de vérification est :</p>
          <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 4px; margin: 20px 0; border-radius: 8px;">
            {{otpCode}}
          </div>
          <p style="color: #666; font-size: 14px;">Ce code expire dans {{expirationMinutes}} minutes.</p>
        </div>
      `,
      variables: ['firstName', 'appName', 'otpCode', 'expirationMinutes'],
    });

    // Template OTP par SMS
    this.registerTemplate({
      id: 'otp_sms',
      name: 'Code OTP par SMS',
      type: 'sms' as any,
      content:
        'Votre code de vérification {{appName}}: {{otpCode}}. Expire dans {{expirationMinutes}}min.',
      variables: ['appName', 'otpCode', 'expirationMinutes'],
    });

    // Template de réinitialisation de mot de passe
    this.registerTemplate({
      id: 'password_reset',
      name: 'Réinitialisation mot de passe',
      type: 'email' as any,
      subject: 'Réinitialisez votre mot de passe - {{appName}}',
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Réinitialisation de mot de passe</h2>
          <p>Bonjour {{firstName}},</p>
          <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le lien ci-dessous :</p>
          <a href="{{resetLink}}" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0;">
            Réinitialiser mon mot de passe
          </a>
          <p>Si vous n'avez pas demandé cette réinitialisation, ignorez ce message.</p>
          <p style="color: #666; font-size: 14px;">Ce lien expire dans {{expirationTime}}.</p>
        </div>
      `,
      variables: ['firstName', 'appName', 'resetLink', 'expirationTime'],
    });

    // Template de bienvenue
    this.registerTemplate({
      id: 'welcome',
      name: 'Message de bienvenue',
      type: 'email' as any,
      subject: 'Bienvenue sur {{appName}} !',
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Bienvenue {{firstName}} {{lastName}} !</h2>
          <p>Votre compte a été vérifié avec succès. Vous pouvez maintenant profiter de toutes les fonctionnalités de {{appName}}.</p>
          <a href="{{loginLink}}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0;">
            Accéder à mon compte
          </a>
          <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
        </div>
      `,
      variables: ['firstName', 'lastName', 'appName', 'loginLink'],
    });
  }

  /**
   * Enregistrer les helpers Handlebars personnalisés
   */
  private registerHelpers(): void {
    Handlebars.registerHelper('formatDate', (date: Date, format: string) => {
      if (!date) return '';
      return date.toLocaleDateString('fr-FR');
    });

    Handlebars.registerHelper('uppercase', (str: string) => {
      return str ? str.toUpperCase() : '';
    });

    Handlebars.registerHelper('lowercase', (str: string) => {
      return str ? str.toLowerCase() : '';
    });
  }
}
