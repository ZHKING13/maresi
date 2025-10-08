import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Kyc, IdentityStatus } from '@prisma/client';
import { MinioService } from '../minio/minio.service';

@Injectable()
export class KycService {
  constructor(
    private prisma: PrismaService,
    private minioService: MinioService,
  ) {}

  async uploadKycFiles(
    userId: number,
    dto: {
      documentType: string;
      kycFor: 'USER' | 'HOST';
      document: Express.Multer.File;
      selfie?: Express.Multer.File;
    },
  ) {
    // Upload files to Minio
    const bucket = 'kyc';
    const docFile = dto.document;
    if (!docFile) throw new BadRequestException('Document requis');
    const docRes = await this.minioService.uploadFile(
      bucket,
      `${userId}_doc_${Date.now()}`,
      docFile.buffer,
      docFile.mimetype,
    );
    let selfieUrl: string | undefined = undefined;
    if (dto.selfie) {
      const selfieRes = await this.minioService.uploadFile(
        bucket,
        `${userId}_selfie_${Date.now()}`,
        dto.selfie.buffer,
        dto.selfie.mimetype,
      );
      selfieUrl = selfieRes.url;
    }
    // Crée une entrée KYC en base
    if (!docRes.url) throw new BadRequestException('Erreur upload document');
    return this.prisma.kyc.create({
      data: {
        userId,
        documentType: dto.documentType,
        kycFor: dto.kycFor,
        documentUrl: docRes.url as string,
        selfieUrl,
        status: 'PENDING',
      },
    });
  }

  async submitKyc(userId: number, dto: any): Promise<Kyc> {
    // TODO: upload files, validate, create KYC
    return this.prisma.kyc.create({
      data: {
        userId,
        ...dto,
        status: 'PENDING',
      },
    });
  }

  async getUserKycStatus(userId: number): Promise<IdentityStatus> {
    const kyc = await this.prisma.kyc.findFirst({
      where: { userId },
      orderBy: { created: 'desc' },
    });
    return kyc?.status || 'PENDING';
  }

  async validateKyc(kycId: number, adminId: number): Promise<Kyc> {
    return this.prisma.kyc.update({
      where: { id: kycId },
      data: {
        status: 'VALIDATED',
        adminId,
        validatedAt: new Date(),
      },
    });
  }

  async rejectKyc(
    kycId: number,
    adminId: number,
    rejectionReason: string,
  ): Promise<Kyc> {
    return this.prisma.kyc.update({
      where: { id: kycId },
      data: {
        status: 'REJECTED',
        adminId,
        rejectionReason,
        validatedAt: new Date(),
      },
    });
  }
}
