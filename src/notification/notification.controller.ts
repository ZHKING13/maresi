import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { CurrentSystemUser } from 'src/_decorators/getters/currentSystemUser.decorator';
import type { ICurrentSystemUser } from 'src/_validators/auth/auth.model';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import {
  NotificationType,
  NotificationPriority,
  INotificationRecipient,
  InAppNotificationOptions,
} from './interfaces';

interface SendNotificationDto {
  type: NotificationType;
  recipients: INotificationRecipient[];
  subject?: string;
  content: string;
  templateId?: string;
  variables?: Record<string, any>;
  priority?: NotificationPriority;
}

interface SendMultiChannelDto {
  types: NotificationType[];
  recipients: INotificationRecipient[];
  subject?: string;
  content: string;
  templateId?: string;
  variables?: Record<string, any>;
  priority?: NotificationPriority;
  stopOnFirstSuccess?: boolean;
}

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Post('send')
  @ApiOperation({ summary: 'Envoyer une notification' })
  @ApiResponse({ status: 200, description: 'Notification envoyée avec succès' })
  async sendNotification(@Body() dto: SendNotificationDto) {
    const data = {
      subject: dto.subject,
      content: dto.content,
      templateId: dto.templateId,
      variables: dto.variables,
    };

    return this.notificationService.send(dto.type, dto.recipients, data, {
      priority: dto.priority,
    });
  }

  @Post('send-multi-channel')
  @ApiOperation({ summary: 'Envoyer une notification multi-canal' })
  @ApiResponse({
    status: 200,
    description: 'Notifications envoyées avec succès',
  })
  async sendMultiChannel(@Body() dto: SendMultiChannelDto) {
    const data = {
      subject: dto.subject,
      content: dto.content,
      templateId: dto.templateId,
      variables: dto.variables,
    };

    return this.notificationService.sendMultiChannel(
      dto.types,
      dto.recipients,
      data,
      {
        priority: dto.priority,
        stopOnFirstSuccess: dto.stopOnFirstSuccess,
      },
    );
  }

  @Post('send-template/:templateId')
  @ApiOperation({ summary: 'Envoyer une notification avec template' })
  @ApiResponse({
    status: 200,
    description: 'Notification avec template envoyée',
  })
  async sendWithTemplate(
    @Param('templateId') templateId: string,
    @Body()
    dto: {
      type: NotificationType;
      recipients: INotificationRecipient[];
      variables?: Record<string, any>;
      priority?: NotificationPriority;
    },
  ) {
    return this.notificationService.sendWithTemplate(
      dto.type,
      templateId,
      dto.recipients,
      dto.variables || {},
      { priority: dto.priority },
    );
  }

  @Get('in-app')
  @ApiOperation({
    summary: "Récupérer les notifications in-app de l'utilisateur connecté",
  })
  @ApiResponse({ status: 200, description: 'Liste des notifications in-app' })
  async getInAppNotification(
    @CurrentSystemUser() user: ICurrentSystemUser,
    @Query('limit', ParseIntPipe) limit?: number,
    @Query('offset', ParseIntPipe) offset?: number,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('type') type?: string,
  ) {
    const options: InAppNotificationOptions = {
      limit: limit || 20,
      offset: offset || 0,
      unreadOnly: unreadOnly === 'true',
      type,
    };

    return this.notificationService.getUserInAppNotifications(user.id, options);
  }

  @Get('in-app/unread-count')
  @ApiOperation({ summary: 'Obtenir le nombre de notifications non lues' })
  @ApiResponse({ status: 200, description: 'Nombre de notifications non lues' })
  async getUnreadCount(@CurrentSystemUser() user: ICurrentSystemUser) {
    const count = await this.notificationService.getUnreadCount(user.id);
    return { count };
  }

  @Put('in-app/:notificationId/read')
  @ApiOperation({ summary: 'Marquer une notification comme lue' })
  @ApiResponse({ status: 200, description: 'Notification marquée comme lue' })
  async markAsRead(
    @CurrentSystemUser() user: ICurrentSystemUser,
    @Param('notificationId') notificationId: string,
  ) {
    const success = await this.notificationService.markInAppAsRead(
      notificationId,
      user.id,
    );
    return { success };
  }

  @Put('in-app/mark-all-read')
  @ApiOperation({ summary: 'Marquer toutes les notifications comme lues' })
  @ApiResponse({
    status: 200,
    description: 'Toutes les notifications marquées comme lues',
  })
  async markAllAsRead(@CurrentSystemUser() user: ICurrentSystemUser) {
    // Cette méthode doit être ajoutée au service
    // const count = await this.notificationService.markAllInAppAsRead(user.id);
    return { message: 'All notifications marked as read' };
  }

  @Get('providers')
  @ApiOperation({ summary: 'Obtenir la liste des providers disponibles' })
  @ApiResponse({ status: 200, description: 'Liste des providers' })
  async getProviders() {
    return this.notificationService.getAvailableProviders();
  }

  // Méthodes utilitaires pour l'authentification

  @Post('send-otp-email')
  @ApiOperation({ summary: 'Envoyer un OTP par email' })
  async sendOtpEmail(
    @Body()
    dto: {
      recipient: INotificationRecipient;
      otpCode: string;
      expirationMinutes?: number;
    },
  ) {
    return this.notificationService.sendOtpEmail(
      dto.recipient,
      dto.otpCode,
      dto.expirationMinutes,
    );
  }

  @Post('send-otp-sms')
  @ApiOperation({ summary: 'Envoyer un OTP par SMS' })
  async sendOtpSms(
    @Body()
    dto: {
      recipient: INotificationRecipient;
      otpCode: string;
      expirationMinutes?: number;
    },
  ) {
    return this.notificationService.sendOtpSms(
      dto.recipient,
      dto.otpCode,
      dto.expirationMinutes,
    );
  }

  @Post('send-verification-email')
  @ApiOperation({ summary: 'Envoyer un email de vérification' })
  async sendVerificationEmail(
    @Body()
    dto: {
      recipient: INotificationRecipient;
      verificationLink: string;
      expirationTime?: string;
    },
  ) {
    return this.notificationService.sendVerificationEmail(
      dto.recipient,
      dto.verificationLink,
      dto.expirationTime,
    );
  }

  @Post('send-welcome-email')
  @ApiOperation({ summary: 'Envoyer un email de bienvenue' })
  async sendWelcomeEmail(
    @Body() dto: { recipient: INotificationRecipient; loginLink: string },
  ) {
    return this.notificationService.sendWelcomeEmail(
      dto.recipient,
      dto.loginLink,
    );
  }
}
