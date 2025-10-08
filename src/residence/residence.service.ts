// ...existing code...

import { Injectable, BadRequestException } from '@nestjs/common';
import { MinioService } from '../minio/minio.service';
import { ResidenceClient } from './residence.client';
import { CreateResidenceDto } from 'src/_validators/residence/residence.dto';

@Injectable()
export class ResidenceService {
  constructor(
    private readonly residenceClient: ResidenceClient,
    private readonly minioService: MinioService,
  ) {}

  async addPhotosToResidence(
    residenceId: number,
    files: Express.Multer.File[],
    userId: number,
  ) {
    if (!files || files.length < 5 || files.length > 10) {
      throw new BadRequestException('Il faut entre 5 et 10 photos.');
    }
    const mediaIds: number[] = [];
    for (const file of files) {
      const upload = await this.minioService.uploadFile(
        'residence-media',
        `${Date.now()}_${file.originalname}`,
        file.buffer,
        file.mimetype,
      );
      const media = await this.residenceClient.createMedia({
        url: upload.url ?? '',
        type: file.mimetype,
      });
      mediaIds.push(media.id);
    }
    // Ajoute les médias à la résidence existante
    return this.residenceClient.addMediaToResidence(
      residenceId,
      mediaIds,
      userId,
    );
  }

  async createResidenceWithMedia(
    dto: CreateResidenceDto,
    files: Express.Multer.File[] | undefined,
    ownerId: number,
  ) {
    let mediaIds: number[] = [];
    if (files && files.length > 0) {
      if (files.length < 5 || files.length > 10) {
        throw new BadRequestException('Il faut entre 5 et 10 photos.');
      }
      for (const file of files) {
        const upload = await this.minioService.uploadFile(
          'residence-media',
          `${Date.now()}_${file.originalname}`,
          file.buffer,
          file.mimetype,
        );
        // Créer l'entrée Media en DB et récupérer son id
        const media = await this.residenceClient.createMedia({
          url: upload.url ?? '',
          type: file.mimetype,
        });
        mediaIds.push(media.id);
      }
    }
    // Créer la résidence avec ou sans médias
    return this.residenceClient.createResidenceWithRelations(
      dto,
      ownerId,
      mediaIds,
    );
  }
  async addRulesToResidence(
    residenceId: number,
    ruleIds: number[],
    userId: number,
  ) {
    return this.residenceClient.addRulesToResidence(
      residenceId,
      ruleIds,
      userId,
    );
  }

  async setRulesForResidence(
    residenceId: number,
    ruleIds: number[],
    userId: number,
  ) {
    return this.residenceClient.setRulesForResidence(
      residenceId,
      ruleIds,
      userId,
    );
  }

  async addSpecialConditionsToResidence(
    residenceId: number,
    specialConditionIds: number[],
    userId: number,
  ) {
    return this.residenceClient.addSpecialConditionsToResidence(
      residenceId,
      specialConditionIds,
      userId,
    );
  }

  async setSpecialConditionsForResidence(
    residenceId: number,
    specialConditionIds: number[],
    userId: number,
  ) {
    return this.residenceClient.setSpecialConditionsForResidence(
      residenceId,
      specialConditionIds,
      userId,
    );
  }

  async setResidenceActiveStatus(
    residenceId: number,
    userId: number,
    isActive: boolean,
  ) {
    return this.residenceClient.setResidenceActiveStatus(
      residenceId,
      userId,
      isActive,
    );
  }
  async searchResidences(params: {
    minLat?: number;
    maxLat?: number;
    minLng?: number;
    maxLng?: number;
    lat?: number;
    lng?: number;
    radius?: number;
    priceMin?: number;
    priceMax?: number;
    residenceTypeId?: number;
    page?: number;
      limit?: number;
    equipmentIds?: number[];
  }) {
    return this.residenceClient.searchResidences(params);
  }

  async getResidenceDetails(id: number) {
    return this.residenceClient.getResidenceDetails(id);
  }
}
