import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationLogService } from './notification-log.service';
import {
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  INotificationPayload,
  INotificationResult,
} from '../interfaces/notification.interface';

describe('NotificationLogService', () => {
  let service: NotificationLogService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    notificationLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      deleteMany: jest.fn(),
      update: jest.fn(),
    },
    notificationSettings: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        NotificationLogService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<NotificationLogService>(NotificationLogService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('createLog', () => {
    it('should create a log entry with all required fields', async () => {
      const payload: INotificationPayload = {
        type: NotificationType.EMAIL,
        recipients: [
          {
            userId: 123,
            email: 'test@example.com',
            name: 'Test User',
          },
        ],
        data: {
          subject: 'Test Subject',
          content: 'Test Content',
          templateId: 'test_template',
          variables: { name: 'John' },
        },
        priority: NotificationPriority.HIGH,
        retryCount: 0,
        maxRetries: 3,
      };

      const result: INotificationResult = {
        success: true,
        messageId: 'msg_123',
        deliveredAt: new Date(),
        metadata: { provider: 'test' },
      };

      const mockLog = {
        id: 'log_123',
        type: NotificationType.EMAIL,
        status: NotificationStatus.SENT,
        priority: NotificationPriority.HIGH,
        recipientUserId: 123,
        recipientEmail: 'test@example.com',
        recipientName: 'Test User',
        subject: 'Test Subject',
        content: 'Test Content',
        templateId: 'test_template',
        variables: { name: 'John' },
        messageId: 'msg_123',
        providerResponse: { provider: 'test' },
        retryCount: 0,
        maxRetries: 3,
        created: new Date(),
        updated: new Date(),
        user: null,
      };

      mockPrismaService.notificationLog.create.mockResolvedValue(mockLog);

      const createdLog = await service.createLog(payload, result);

      expect(mockPrismaService.notificationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: NotificationType.EMAIL,
          status: NotificationStatus.SENT,
          priority: NotificationPriority.HIGH,
          recipientUserId: 123,
          recipientEmail: 'test@example.com',
          recipientName: 'Test User',
          subject: 'Test Subject',
          content: 'Test Content',
          templateId: 'test_template',
          messageId: 'msg_123',
        }),
        include: { user: true },
      });

      expect(createdLog.id).toBe('log_123');
      expect(createdLog.type).toBe(NotificationType.EMAIL);
    });

    it('should handle optional fields correctly', async () => {
      const payload: INotificationPayload = {
        type: NotificationType.SMS,
        recipients: [
          {
            phoneNumber: '+1234567890',
            // Pas d'userId, email, ou name
          },
        ],
        data: {
          content: 'SMS Content',
          // Pas de subject, templateId, ou variables
        },
        priority: NotificationPriority.MEDIUM,
        retryCount: 0,
        maxRetries: 3,
      };

      const result: INotificationResult = {
        success: false,
        error: 'SMS delivery failed',
      };

      const mockLog = {
        id: 'log_456',
        type: NotificationType.SMS,
        status: NotificationStatus.FAILED,
        priority: NotificationPriority.MEDIUM,
        recipientPhone: '+1234567890',
        content: 'SMS Content',
        errorMessage: 'SMS delivery failed',
        retryCount: 0,
        maxRetries: 3,
        created: new Date(),
        updated: new Date(),
        user: null,
      };

      mockPrismaService.notificationLog.create.mockResolvedValue(mockLog);

      await service.createLog(payload, result);

      const createCall =
        mockPrismaService.notificationLog.create.mock.calls[0][0];

      // Vérifier que les champs optionnels non définis ne sont pas dans l'objet data
      expect(createCall.data).not.toHaveProperty('recipientUserId');
      expect(createCall.data).not.toHaveProperty('recipientEmail');
      expect(createCall.data).not.toHaveProperty('recipientName');
      expect(createCall.data).not.toHaveProperty('subject');
      expect(createCall.data).not.toHaveProperty('templateId');
      expect(createCall.data).not.toHaveProperty('messageId');

      // Vérifier que les champs définis sont présents
      expect(createCall.data.recipientPhone).toBe('+1234567890');
      expect(createCall.data.content).toBe('SMS Content');
      expect(createCall.data.errorMessage).toBe('SMS delivery failed');
      expect(createCall.data.status).toBe(NotificationStatus.FAILED);
    });

    it('should handle empty recipients array gracefully', async () => {
      const payload: INotificationPayload = {
        type: NotificationType.FCM,
        recipients: [], // Tableau vide
        data: {
          content: 'FCM Content',
        },
        priority: NotificationPriority.LOW,
        retryCount: 0,
        maxRetries: 3,
      };

      const result: INotificationResult = {
        success: true,
        messageId: 'fcm_123',
      };

      const mockLog = {
        id: 'log_789',
        type: NotificationType.FCM,
        status: NotificationStatus.SENT,
        content: 'FCM Content',
        messageId: 'fcm_123',
        created: new Date(),
        updated: new Date(),
        user: null,
      };

      mockPrismaService.notificationLog.create.mockResolvedValue(mockLog);

      await service.createLog(payload, result);

      const createCall =
        mockPrismaService.notificationLog.create.mock.calls[0][0];

      // Vérifier qu'aucun champ de destinataire n'est défini
      expect(createCall.data).not.toHaveProperty('recipientUserId');
      expect(createCall.data).not.toHaveProperty('recipientEmail');
      expect(createCall.data).not.toHaveProperty('recipientPhone');
      expect(createCall.data).not.toHaveProperty('recipientName');
    });
  });

  describe('updateLogStatus', () => {
    it('should update log status and timestamps correctly', async () => {
      const logId = 'log_123';
      const status = NotificationStatus.DELIVERED;
      const metadata = { deliveryTime: 1500 };

      mockPrismaService.notificationLog.update.mockResolvedValue({});

      await service.updateLogStatus(logId, status, metadata);

      expect(mockPrismaService.notificationLog.update).toHaveBeenCalledWith({
        where: { id: logId },
        data: expect.objectContaining({
          status: NotificationStatus.DELIVERED,
          deliveredAt: expect.any(Date),
          providerResponse: metadata,
          updated: expect.any(Date),
        }),
      });
    });
  });
});

/**
 * Test d'intégration rapide pour le logging
 * À exécuter manuellement pour tester le système complet
 */
export const testNotificationLogging = async () => {
  console.log('🧪 Test du système de logging des notifications...');

  // Simuler une notification email réussie
  const emailPayload: INotificationPayload = {
    type: NotificationType.EMAIL,
    recipients: [
      {
        userId: 1,
        email: 'test@example.com',
        name: 'Test User',
      },
    ],
    data: {
      subject: 'Test Email',
      content: "Ceci est un test d'email.",
      templateId: 'test_template',
      variables: { firstName: 'John' },
    },
    priority: NotificationPriority.MEDIUM,
    retryCount: 0,
    maxRetries: 3,
  };

  const emailResult: INotificationResult = {
    success: true,
    messageId: 'email_msg_123456',
    deliveredAt: new Date(),
    metadata: { provider: 'nodemailer', smtp: 'gmail' },
  };

  console.log('✅ Payload email créé:', JSON.stringify(emailPayload, null, 2));
  console.log('✅ Résultat email créé:', JSON.stringify(emailResult, null, 2));

  // Simuler une notification SMS échouée
  const smsPayload: INotificationPayload = {
    type: NotificationType.SMS,
    recipients: [
      {
        phoneNumber: '+33123456789',
        name: 'Test User SMS',
      },
    ],
    data: {
      content: 'Votre code de vérification : 123456',
    },
    priority: NotificationPriority.HIGH,
    retryCount: 2,
    maxRetries: 3,
  };

  const smsResult: INotificationResult = {
    success: false,
    error: 'Invalid phone number format',
    metadata: { provider: 'twilio', errorCode: 'E_INVALID_PHONE' },
  };

  console.log('❌ Payload SMS créé:', JSON.stringify(smsPayload, null, 2));
  console.log('❌ Résultat SMS créé:', JSON.stringify(smsResult, null, 2));

  console.log(
    '🎯 Les objets de test sont prêts pour être utilisés avec NotificationLogService.createLog()',
  );
};
