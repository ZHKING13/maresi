# Module de Notification

Un système de notification flexible et extensible pour NestJS supportant plusieurs canaux de communication : Email, SMS, FCM (Firebase Cloud Messaging) et notifications In-App.

## Fonctionnalités

- **Multi-providers** : Email (Nodemailer), SMS (Twilio/Vonage), FCM, Push In-App
- **Système de templates** : Templates Handlebars avec variables dynamiques
- **Configuration flexible** : Activation/désactivation par provider
- **Notifications multi-canal** : Envoi simultané sur plusieurs canaux
- **Templates prédéfinis** : OTP, vérification email, bienvenue, etc.
- **Notifications In-App** : Stockage et gestion des notifications internes
- **API REST complète** : Contrôleurs pour toutes les fonctionnalités

## Installation

```bash
# Installer les dépendances optionnelles selon vos besoins
npm install nodemailer handlebars
npm install @types/nodemailer @types/handlebars --save-dev

# Pour Twilio SMS
npm install twilio

# Pour Firebase FCM
npm install firebase-admin
```

## Configuration

### Variables d'environnement

```env
# Email
EMAIL_ENABLED=true
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourapp.com

# SMS
SMS_ENABLED=true
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_FROM_NUMBER=+1234567890

# FCM
FCM_ENABLED=true
FCM_PROJECT_ID=your-firebase-project
FCM_SERVICE_ACCOUNT_PATH=path/to/firebase-service-account.json

# In-App
PUSH_IN_APP_ENABLED=true
NOTIFICATION_RETENTION_DAYS=30

# App
APP_NAME=Mon Application
```

### Intégration dans AppModule

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationModule } from './notification/notification.module';
import { nameSpacedNotificationConfig } from './_config';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [nameSpacedNotificationConfig],
      isGlobal: true,
    }),
    NotificationModule, // Module standard, la configuration est chargée automatiquement
    // ... autres modules
  ],
})
export class AppModule {}
```

## Utilisation

### Service de notification

```typescript
import { Injectable } from '@nestjs/common';
import { NotificationService } from './notification/notification.service';
import {
  NotificationType,
  NotificationPriority,
} from './notification/interfaces';

@Injectable()
export class AuthService {
  constructor(private notificationService: NotificationService) {}

  async sendOtpEmail(user: User, otpCode: string) {
    const recipient = {
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      userId: user.id,
    };

    return this.notificationService.sendOtpEmail(
      recipient,
      otpCode,
      10, // 10 minutes d'expiration
    );
  }

  async sendWelcomeNotification(user: User) {
    const recipient = {
      email: user.email,
      phoneNumber: user.phoneNumber,
      fcmToken: user.fcmToken,
      name: `${user.firstName} ${user.lastName}`,
      userId: user.id,
    };

    const loginLink = `${process.env.FRONTEND_URL}/login`;

    // Envoyer par email ET notification in-app
    const results = await this.notificationService.sendMultiChannel(
      [NotificationType.EMAIL, NotificationType.PUSH_IN_APP],
      [recipient],
      {
        templateId: 'welcome',
        content: '',
        variables: {
          firstName: user.firstName,
          lastName: user.lastName,
          appName: 'Mon App',
          loginLink,
        },
      },
      { priority: NotificationPriority.MEDIUM },
    );

    return results;
  }
}
```

### Envoi avec templates personnalisés

```typescript
// Enregistrer un template personnalisé
this.notificationService.templateService.registerTemplate({
  id: 'custom_welcome',
  name: 'Bienvenue personnalisé',
  type: NotificationType.EMAIL,
  subject: 'Bienvenue {{firstName}} sur {{appName}} !',
  content: `
    <h1>Bonjour {{firstName}} {{lastName}} !</h1>
    <p>Bienvenue sur {{appName}}. Voici vos informations :</p>
    <ul>
      <li>Email : {{email}}</li>
      <li>Date d'inscription : {{#formatDate registrationDate 'DD/MM/YYYY'}}{{/formatDate}}</li>
    </ul>
  `,
  variables: ['firstName', 'lastName', 'appName', 'email', 'registrationDate'],
});

// Utiliser le template
await this.notificationService.sendWithTemplate(
  NotificationType.EMAIL,
  'custom_welcome',
  [recipient],
  {
    firstName: 'John',
    lastName: 'Doe',
    appName: 'Mon App',
    email: 'john@example.com',
    registrationDate: new Date(),
  },
);
```

### Notifications In-App

```typescript
// Envoyer une notification in-app
await this.notificationService.sendInApp([{ userId: 123, name: 'John Doe' }], {
  subject: 'Nouvelle fonctionnalité',
  content: 'Découvrez notre nouvelle fonctionnalité !',
  metadata: { type: 'feature', priority: 'medium' },
});

// Récupérer les notifications d'un utilisateur
const notifications = await this.notificationService.getUserInAppNotifications(
  userId,
  {
    limit: 10,
    offset: 0,
    unreadOnly: true,
  },
);

// Marquer comme lu
await this.notificationService.markInAppAsRead(notificationId, userId);

// Compter les non lues
const unreadCount = await this.notificationService.getUnreadCount(userId);
```

## API REST

### Endpoints disponibles

```bash
# Envoyer une notification
POST /notifications/send
{
  "type": "email",
  "recipients": [{"email": "user@example.com", "name": "User"}],
  "subject": "Test",
  "content": "Contenu du message",
  "priority": "high"
}

# Envoyer multi-canal
POST /notifications/send-multi-channel
{
  "types": ["email", "push_in_app"],
  "recipients": [{"email": "user@example.com", "userId": 123}],
  "content": "Message multi-canal",
  "stopOnFirstSuccess": false
}

# Utiliser un template
POST /notifications/send-template/otp_email
{
  "type": "email",
  "recipients": [{"email": "user@example.com"}],
  "variables": {"firstName": "John", "otpCode": "123456"}
}

# Notifications in-app
GET /notifications/in-app?limit=10&unreadOnly=true
GET /notifications/in-app/unread-count
PUT /notifications/in-app/{id}/read
PUT /notifications/in-app/mark-all-read

# Utilitaires
POST /notifications/send-otp-email
POST /notifications/send-otp-sms
POST /notifications/send-verification-email
POST /notifications/send-welcome-email

# Statut des providers
GET /notifications/providers
```

## Templates prédéfinis

Le module inclut plusieurs templates prêts à l'emploi :

- **`email_verification`** : Email de vérification d'adresse
- **`otp_email`** : Code OTP par email
- **`otp_sms`** : Code OTP par SMS
- **`password_reset`** : Réinitialisation de mot de passe
- **`welcome`** : Message de bienvenue

### Variables disponibles

Chaque template utilise des variables Handlebars :

```handlebars
{{firstName}}
{{lastName}}
{{appName}}
{{otpCode}}
{{expirationMinutes}}
{{verificationLink}}
{{resetLink}}
{{loginLink}}
{{expirationTime}}
```

### Helpers Handlebars

```handlebars
{{formatDate date 'DD/MM/YYYY'}}
{{uppercase text}}
{{lowercase text}}
```

## Extension et personnalisation

### Créer un provider personnalisé

```typescript
import { Injectable } from '@nestjs/common';
import { INotificationProvider, NotificationType } from '../interfaces';

@Injectable()
export class SlackNotificationProvider implements INotificationProvider {
  readonly type = NotificationType.SLACK; // Ajouter ce type à l'enum
  readonly isEnabled = true;

  async send(payload: INotificationPayload): Promise<INotificationResult> {
    // Implémentation Slack
    return { success: true, messageId: 'slack_123' };
  }

  validateRecipient(recipient: INotificationRecipient): boolean {
    return !!recipient.slackUserId;
  }

  async formatMessage(data: INotificationData): Promise<string> {
    return data.content;
  }
}
```

### Intégration avec des événements

```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class UserService {
  constructor(
    private eventEmitter: EventEmitter2,
    private notificationService: NotificationService,
  ) {
    // Écouter les événements
    this.eventEmitter.on('user.registered', this.onUserRegistered.bind(this));
  }

  private async onUserRegistered(user: User) {
    // Envoyer automatiquement l'email de vérification
    await this.notificationService.sendVerificationEmail(
      { email: user.email, name: user.name },
      `${process.env.FRONTEND_URL}/verify?token=${user.verificationToken}`,
    );
  }
}
```

## Sécurité et bonnes pratiques

1. **Variables d'environnement** : Stockez toutes les clés API dans des variables d'environnement
2. **Validation** : Validez toujours les recipients avant envoi
3. **Rate limiting** : Implémentez une limitation pour éviter le spam
4. **Logs** : Activez les logs pour tracer les envois
5. **Retry** : Gérez les échecs avec des tentatives de renvoi
6. **Templates** : Validez les variables de template avant envoi

## Débogage

```typescript
// Activer les logs détaillés
process.env.LOG_LEVEL = 'debug';

// Vérifier les providers disponibles
const providers = this.notificationService.getAvailableProviders();
console.log('Providers:', providers);

// Tester la compilation de template
const compiled = this.templateService.compileTemplate('otp_email', {
  firstName: 'Test',
  otpCode: '123456',
});
console.log('Template compiled:', compiled);
```

## Migration depuis l'ancien système

Si vous avez un système existant, voici comment migrer :

```typescript
// Ancien code
await this.emailService.sendVerificationCode(email, code);

// Nouveau code
await this.notificationService.sendOtpEmail({ email, name: 'User' }, code);

// Ou pour remplacer complètement
await this.notificationService.send(
  NotificationType.EMAIL,
  [{ email, name: 'User' }],
  {
    templateId: 'otp_email',
    variables: { firstName: 'User', otpCode: code },
  },
);
```

## Performance

- **Templates** : Les templates sont compilés et mis en cache
- **Providers** : Initialisation lazy des connexions
- **In-App** : Nettoyage automatique des notifications expirées
- **Batch** : Support des envois en lot pour les gros volumes

## Roadmap

- [ ] Intégration WebSockets pour notifications temps réel
- [ ] Support des notifications programmées (cron jobs)
- [ ] Analytics et métriques d'envoi
- [ ] Interface d'administration web
- [ ] Support des pièces jointes pour tous les providers
- [ ] Système de templates avancé avec conditions
