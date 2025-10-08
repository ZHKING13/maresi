import { Query, Param, Get } from '@nestjs/common';

import {
  updateResidenceRulesSchema,
  updateResidenceSpecialConditionsSchema,
} from 'src/_validators/residence/residence-rules.schema';
import { residenceResponseSchema } from '../_validators/residence/residence-response.schema';

import {
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
  Body,
  Req,
  Put,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ResidenceService } from './residence.service';
import { CreateResidenceDto } from 'src/_validators/residence/residence.dto';
import { CurrentSystemUser } from 'src/_decorators/getters/currentSystemUser.decorator';
import { ApiTags } from '@nestjs/swagger';
import { CustomSwaggerDecorator } from 'src/_decorators/setters/swagger.decorator';
import { IApiResponse } from 'src/_validators/global/global.model';
import { CustomRole } from 'src/_decorators/setters/roles.decorator';
import { ROLES_ENUM } from '@prisma/client';
import { RESIDENCE_PATHS } from 'src/_paths/residence';
import { residenceSearchQuerySchema } from 'src/_validators/residence/residence-search-query.schema';

@ApiTags('residences')
@Controller('residences')
export class ResidenceController {
  // Ajouter des rules à une résidence
  @Post(RESIDENCE_PATHS.ADD_RULES)
  @CustomRole(['HOST'])
  @CustomSwaggerDecorator({
    summary: 'Ajouter des règles à une annonce',
    bodyDec: { payloadSchema: updateResidenceRulesSchema },
    resDec: {
      responseSchema: residenceResponseSchema,
    },
  })
  async addRules(
    @Req() req: any,
    @Body() body: { ruleIds: number[] },
    @CurrentSystemUser() user: any,
  ) {
    const residenceId = Number(req.params.id);
    const result = await this.residenceService.addRulesToResidence(
      residenceId,
      body.ruleIds,
      user.id,
    );
    return { message: 'Règles ajoutées', data: result };
  }

  // Remplacer toutes les rules d'une résidence
  @Post(RESIDENCE_PATHS.REPLACE_RULES)
  @CustomRole(['HOST'])
  @CustomSwaggerDecorator({
    summary: "Remplacer toutes les règles d'une annonce",
    bodyDec: { payloadSchema: updateResidenceRulesSchema },
    resDec: {
      responseSchema: residenceResponseSchema,
    },
  })
  async setRules(
    @Req() req: any,
    @Body() body: { ruleIds: number[] },
    @CurrentSystemUser() user: any,
  ) {
    const residenceId = Number(req.params.id);
    const result = await this.residenceService.setRulesForResidence(
      residenceId,
      body.ruleIds,
      user.id,
    );
    return { message: 'Règles remplacées', data: result };
  }

  // Ajouter des specialConditions à une résidence
  @Post(RESIDENCE_PATHS.ADD_SPECIAL_CONDITIONS)
  @CustomRole(['HOST'])
  @CustomSwaggerDecorator({
    summary: 'Ajouter des conditions spéciales à une annonce',
    bodyDec: { payloadSchema: updateResidenceSpecialConditionsSchema },
    resDec: {
      responseSchema: residenceResponseSchema,
    },
  })
  async addSpecialConditions(
    @Req() req: any,
    @Body() body: { specialConditionIds: number[] },
    @CurrentSystemUser() user: any,
  ) {
    const residenceId = Number(req.params.id);
    const result = await this.residenceService.addSpecialConditionsToResidence(
      residenceId,
      body.specialConditionIds,
      user.id,
    );
    return { message: 'Conditions spéciales ajoutées', data: result };
  }

  // Remplacer toutes les specialConditions d'une résidence
  @Put(RESIDENCE_PATHS.REPLACE_SPECIAL_CONDITIONS)
  @CustomRole(['HOST'])
  @CustomSwaggerDecorator({
    summary: "Remplacer toutes les conditions spéciales d'une annonce",
    bodyDec: { payloadSchema: updateResidenceSpecialConditionsSchema },
    resDec: {
      responseSchema: residenceResponseSchema,
    },
  })
  async setSpecialConditions(
    @Req() req: any,
    @Body() body: { specialConditionIds: number[] },
    @CurrentSystemUser() user: any,
  ) {
    const residenceId = Number(req.params.id);
    const result = await this.residenceService.setSpecialConditionsForResidence(
      residenceId,
      body.specialConditionIds,
      user.id,
    );
    return { message: 'Conditions spéciales remplacées', data: result };
  }
  // Upload de photos pour une annonce existante
  @Post(RESIDENCE_PATHS.UPLOAD_PHOTOS)
  @CustomRole(['HOST'])
  @CustomSwaggerDecorator({
    summary: 'Uploader des photos pour une annonce',
    bodyDec: {
      // Pas de payloadSchema car c'est du multipart, mais on documente le champ files
      payloadSchema: undefined,
    },
    resDec: {
      responseSchema: residenceResponseSchema,
    },
  })
  @UseInterceptors(AnyFilesInterceptor())
  async uploadPhotos(
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentSystemUser() user: any,
    @Req() req: any,
  ) {
    const residenceId = Number(req.params.id);
    if (!files || files.length < 5 || files.length > 10) {
      return { message: 'Il faut entre 5 et 10 photos.', data: null };
    }
    const result = await this.residenceService.addPhotosToResidence(
      residenceId,
      files,
      user.id,
    );
    return {
      message: 'Photos ajoutées avec succès',
      data: result,
    };
  }
  constructor(private readonly residenceService: ResidenceService) {}

  // Create residence (annonce)
  @Post(RESIDENCE_PATHS.CREATE)
  @CustomRole(['HOST'])
  @CustomSwaggerDecorator({
    summary: 'Créer une annonce avec photos (upload direct)',
    bodyDec: {
      payloadSchema: CreateResidenceDto.schema,
    },
    resDec: {
      responseSchema: residenceResponseSchema,
    },
  })
  @UseInterceptors(AnyFilesInterceptor())
  async createResidence(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: CreateResidenceDto,
    @CurrentSystemUser() user: any,
  ): Promise<IApiResponse<any>> {
    const created = await this.residenceService.createResidenceWithMedia(
      body,
      files,
      user.id,
    );
    return {
      message: 'Annonce créée avec succès',
      data: created,
    };
  }
  @Put(RESIDENCE_PATHS.ACTIVATE)
  @CustomRole(['HOST'])
  @CustomSwaggerDecorator({
    summary: 'Activer une annonce',
    resDec: { responseSchema: residenceResponseSchema },
  })
  async activateResidence(
    @Req() req: any,
    @CurrentSystemUser() user: any,
  ): Promise<IApiResponse<any>> {
    const residenceId = Number(req.params.id);
    const result = await this.residenceService.setResidenceActiveStatus(
      residenceId,
      user.id,
      true,
    );
    return { message: 'Annonce activée', data: result };
  }

  @Post(RESIDENCE_PATHS.DEACTIVATE)
  @CustomRole(['HOST'])
  @CustomSwaggerDecorator({
    summary: 'Désactiver une annonce',
      resDec: { responseSchema: residenceResponseSchema },
    
  })
  async deactivateResidence(
    @Req() req: any,
    @CurrentSystemUser() user: any,
  ): Promise<IApiResponse<any>> {
    const residenceId = Number(req.params.id);
    const result = await this.residenceService.setResidenceActiveStatus(
      residenceId,
      user.id,
      false,
    );
    return { message: 'Annonce désactivée', data: result };
  }
  // Recherche de logements (client)
  @Get(RESIDENCE_PATHS.SEARCH)
  @CustomSwaggerDecorator({
    summary: 'Recherche de logements',
    queryDec: {
      querySchema: residenceSearchQuerySchema,
    },
    resDec: { responseSchema: residenceResponseSchema },
  })
  async searchResidences(
    @Query('minLat') minLat?: number,
    @Query('maxLat') maxLat?: number,
    @Query('minLng') minLng?: number,
    @Query('maxLng') maxLng?: number,
    @Query('priceMin') priceMin?: number,
    @Query('priceMax') priceMax?: number,
    @Query('residenceTypeId') residenceTypeId?: number,
    @Query('equipmentIds') equipmentIds?: number[],
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<IApiResponse<any>> {
      const result = await this.residenceService.searchResidences({
        
      minLat,
      maxLat,
      minLng,
      maxLng,
      priceMin,
      priceMax,
      residenceTypeId,
      equipmentIds,
      page,
      limit,
    });
    return { message: 'Résultats de recherche', data: result };
  }

  // Fiche logement (client)
  @Get(RESIDENCE_PATHS.DETAILS)
  @CustomSwaggerDecorator({
    summary: 'Fiche logement',
    resDec: { responseSchema: residenceResponseSchema },
  })
  async getResidenceDetails(
    @Param('id') id: number,
  ): Promise<IApiResponse<any>> {
    const result = await this.residenceService.getResidenceDetails(id);
    return { message: 'Détail logement', data: result };
  }
}
