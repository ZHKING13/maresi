import {
  Controller,
  Post,
  UseGuards,
  Body,
  Req,
  Get,
  Param,
  Patch,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { kycUploadSchema } from '../_validators/kyc/kyc-upload.schema';
import { ZodError } from 'zod';
import { KycService } from './kyc.service';
import { CustomSwaggerDecorator } from '../_decorators/setters/swagger.decorator';
import { ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../_guards/roles.guard';
import { CustomRole } from '../_decorators/setters/roles.decorator';
import { ROLES_ENUM } from '@prisma/client';
import { CurrentSystemUser } from 'src/_decorators/getters/currentSystemUser.decorator';

@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @CustomSwaggerDecorator({
    summary: "Upload pièce d'identité et selfie pour KYC",
    statusOK: true,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        documentType: { type: 'string', example: 'CNI' },
        kycFor: { type: 'string', enum: ['USER', 'HOST'], example: 'USER' },
        document: { type: 'string', format: 'binary' },
        selfie: { type: 'string', format: 'binary', nullable: true },
      },
      required: ['documentType', 'kycFor', 'document'],
    },
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 2))
  async uploadKycFiles(
    @Req() req,
    @Body() body: any,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    // files[0] = document, files[1] = selfie (optionnel)
    try {
      const parsed = kycUploadSchema.parse({
        documentType: body.documentType,
        kycFor: body.kycFor,
        document: files[0],
        selfie: files[1],
      });
      return this.kycService.uploadKycFiles(req.user.id, parsed);
    } catch (e) {
      if (e instanceof ZodError) {
        return { error: e.issues };
      }
      throw e;
    }
  }

  @CustomSwaggerDecorator({
    summary: 'Soumettre une demande KYC',
    statusOK: true,
  })
  @UseGuards(JwtAuthGuard)
  @Post('submit')
  async submitKyc(@Req() req, @Body() dto: any) {
    return this.kycService.submitKyc(req.user.id, dto);
  }

  @CustomSwaggerDecorator({
    summary: "Récupérer le statut KYC de l'utilisateur",
    statusOK: true,
  })
  @UseGuards(JwtAuthGuard)
  @Get('status')
  async getStatus(@Req() req) {
    return this.kycService.getUserKycStatus(req.user.id);
  }

  @CustomSwaggerDecorator({
    summary: 'Valider une demande KYC (admin)',
    statusOK: true,
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @CustomRole([ROLES_ENUM.ADMIN])
  @Patch(':id/validate')
  async validateKyc(@Req() req, @Param('id') id: string) {
    return this.kycService.validateKyc(Number(id), req.user.id);
  }

  @CustomSwaggerDecorator({
    summary: 'Rejeter une demande KYC (admin)',
    statusOK: true,
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @CustomRole([ROLES_ENUM.ADMIN])
  @Patch(':id/reject')
  async rejectKyc(
    @Req() req,
    @CurrentSystemUser() { id }: { id: number },
    @Body('rejectionReason') reason: string,
  ) {
    return this.kycService.rejectKyc(Number(id), req.user.id, reason);
  }
}
