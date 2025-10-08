import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResidenceDto } from 'src/_validators/residence/residence.dto';

@Injectable()
export class ResidenceClient {
  constructor(private readonly prisma: PrismaService) {}

  async createMedia(data: { url: string; type: string }) {
    return this.prisma.media.create({ data });
  }

  async createResidenceWithRelations(
    dto: CreateResidenceDto,
    ownerId: number,
    mediaIds: number[],
  ) {
    // Création de la résidence + liaisons media
    return this.prisma.residence.create({
      data: {
        title: dto.title,
        description: dto.description,
        pricePerNight: dto.pricePerNight,
        lat: dto.lat,
        lng: dto.lng,
        residenceTypeId: dto.residenceTypeId,
        ownerId,
        media: {
          create: mediaIds.map((mediaId) => ({
            media: { connect: { id: mediaId } },
          })),
        },
        rules: dto.ruleIds
          ? {
              create: dto.ruleIds.map((ruleId) => ({
                rule: { connect: { id: ruleId } },
              })),
            }
          : undefined,
        specialConditions: dto.specialConditionIds
          ? {
              create: dto.specialConditionIds.map((id) => ({
                specialCondition: { connect: { id } },
              })),
            }
          : undefined,
        equipments: dto.equipmentIds
          ? {
              create: dto.equipmentIds.map((equipmentId) => ({
                equipment: { connect: { id: equipmentId } },
              })),
            }
          : undefined,
      },
      include: {
        media: true,
        rules: true,
        specialConditions: true,
        equipments: { include: { equipment: true } },
      },
    });
  }

  // Ajout/modification de rules et specialConditions

  async setResidenceActiveStatus(
    residenceId: number,
    userId: number,
    isActive: boolean,
  ) {
    // Vérifie que l'utilisateur est bien le propriétaire
    const residence = await this.prisma.residence.findUnique({
      where: { id: residenceId },
      select: { ownerId: true },
    });
    if (!residence || residence.ownerId !== userId) {
      throw new Error('Unauthorized');
    }
    return this.prisma.residence.update({
      where: { id: residenceId },
      data: { isActive },
      include: { media: true, rules: true, specialConditions: true },
    });
  }
  async addRulesToResidence(
    residenceId: number,
    ruleIds: number[],
    userId: number,
  ) {
    const residence = await this.prisma.residence.findUnique({
      where: { id: residenceId },
      select: { ownerId: true },
    });
    if (!residence || residence.ownerId !== userId)
      throw new Error('Unauthorized');
    await this.prisma.residence.update({
      where: { id: residenceId },
      data: {
        rules: {
          create: ruleIds.map((ruleId) => ({
            rule: { connect: { id: ruleId } },
          })),
        },
      },
    });
    return this.prisma.residence.findUnique({
      where: { id: residenceId },
      include: { media: true, rules: true, specialConditions: true },
    });
  }

  async setRulesForResidence(
    residenceId: number,
    ruleIds: number[],
    userId: number,
  ) {
    const residence = await this.prisma.residence.findUnique({
      where: { id: residenceId },
      select: { ownerId: true },
    });
    if (!residence || residence.ownerId !== userId)
      throw new Error('Unauthorized');
    await this.prisma.residenceRule.deleteMany({ where: { residenceId } });
    await this.prisma.residence.update({
      where: { id: residenceId },
      data: {
        rules: {
          create: ruleIds.map((ruleId) => ({
            rule: { connect: { id: ruleId } },
          })),
        },
      },
    });
    return this.prisma.residence.findUnique({
      where: { id: residenceId },
      include: { media: true, rules: true, specialConditions: true },
    });
  }

  async addSpecialConditionsToResidence(
    residenceId: number,
    specialConditionIds: number[],
    userId: number,
  ) {
    const residence = await this.prisma.residence.findUnique({
      where: { id: residenceId },
      select: { ownerId: true },
    });
    if (!residence || residence.ownerId !== userId)
      throw new Error('Unauthorized');
    await this.prisma.residence.update({
      where: { id: residenceId },
      data: {
        specialConditions: {
          create: specialConditionIds.map((id) => ({
            specialCondition: { connect: { id } },
          })),
        },
      },
    });
    return this.prisma.residence.findUnique({
      where: { id: residenceId },
      include: { media: true, rules: true, specialConditions: true },
    });
  }

  async setSpecialConditionsForResidence(
    residenceId: number,
    specialConditionIds: number[],
    userId: number,
  ) {
    const residence = await this.prisma.residence.findUnique({
      where: { id: residenceId },
      select: { ownerId: true },
    });
    if (!residence || residence.ownerId !== userId)
      throw new Error('Unauthorized');
    await this.prisma.residenceSpecialCondition.deleteMany({
      where: { residenceId },
    });
    await this.prisma.residence.update({
      where: { id: residenceId },
      data: {
        specialConditions: {
          create: specialConditionIds.map((id) => ({
            specialCondition: { connect: { id } },
          })),
        },
      },
    });
    return this.prisma.residence.findUnique({
      where: { id: residenceId },
      include: { media: true, rules: true, specialConditions: true },
    });
  }

  async addMediaToResidence(
    residenceId: number,
    mediaIds: number[],
    userId: number,
  ) {
    // vérifier que l'utilisateur est bien le propriétaire de la résidence
    let residence = await this.prisma.residence.findUnique({
      where: { id: residenceId },
      select: { ownerId: true },
    });

    if (!residence || residence.ownerId !== userId) {
      throw new Error('Unauthorized');
    }
    // Ajoute les médias à la résidence existante
    await this.prisma.residence.update({
      where: { id: residenceId },
      data: {
        media: {
          create: mediaIds.map((mediaId) => ({
            media: { connect: { id: mediaId } },
          })),
        },
      },
    });
    // Retourne la résidence mise à jour avec les médias
    return this.prisma.residence.findUnique({
      where: { id: residenceId },
      include: { media: true, rules: true, specialConditions: true },
    });
  }
  async searchResidences(params: {
    lat?: number;
    lng?: number;
    radius?: number;
    priceMin?: number;
    priceMax?: number;
    residenceTypeId?: number;
    page?: number;
    limit?: number;
  }) {
    const {
      lat,
      lng,
      radius,
      priceMin,
      priceMax,
      residenceTypeId,
      page = 1,
      limit = 10,
      equipmentIds,
      minLat,
      maxLat,
      minLng,
      maxLng,
    } = params as any;

    // Bounding box : minLat, maxLat, minLng, maxLng
    const where: any = {
      isActive: true,
    };
    if (
      minLat !== undefined &&
      maxLat !== undefined &&
      minLng !== undefined &&
      maxLng !== undefined
    ) {
      where.lat = { gte: minLat, lte: maxLat };
      where.lng = { gte: minLng, lte: maxLng };
    }
    if (priceMin !== undefined || priceMax !== undefined) {
      where.pricePerNight = {};
      if (priceMin !== undefined) where.pricePerNight.gte = priceMin;
      if (priceMax !== undefined) where.pricePerNight.lte = priceMax;
    }
    if (residenceTypeId !== undefined) {
      where.residenceTypeId = residenceTypeId;
    }
    if (
      equipmentIds &&
      Array.isArray(equipmentIds) &&
      equipmentIds.length > 0
    ) {
      where.equipments = {
        some: {
          equipmentId: { in: equipmentIds },
        },
      };
    }

    const skip = (page - 1) * limit;
    const residences = await this.prisma.residence.findMany({
      where,
      skip,
      take: limit,
      include: {
        media: true,
        rules: { include: { rule: true } },
        specialConditions: { include: { specialCondition: true } },
        equipments: { include: { equipment: true } },
        type: true,
      },
    });
    return residences;
  }

  async getResidenceDetails(id: number) {
    // TODO: Implémenter la récupération complète d'une fiche logement
    return null;
  }
}
