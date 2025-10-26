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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../_guards/roles.guard';
import { CustomRole } from '../_decorators/setters/roles.decorator';
import { CurrentSystemUser } from '../_decorators/getters/currentSystemUser.decorator';
import { PublicEndpoint } from '../_decorators/setters/publicEndpoint.decorator';
import { ROLES_ENUM } from '@prisma/client';
import type {
  IReview,
  IReviewResponse,
  ICreateReviewDto,
  IUpdateReviewDto,
  ICreateResponseDto,
  IUpdateResponseDto,
  IReviewQueryDto,
  IReviewStatsDto,
} from '../_validators/review';
import {
  ReviewStatus,
  ResponseStatus,
  createReviewSchema,
  updateReviewSchema,
  createResponseSchema,
  updateResponseSchema,
  reviewQuerySchema,
} from '../_validators/review';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  /**
   * ===== ENDPOINTS PUBLICS =====
   */

  @Get()
  @PublicEndpoint()
  @ApiOperation({ summary: 'Obtenir les avis avec filtres et pagination' })
  @ApiResponse({
    status: 200,
    description: 'Liste des avis avec pagination',
  })
  async getReviews(@Query() query: IReviewQueryDto) {
    // Validation des paramètres de requête
    const validatedQuery = reviewQuerySchema.parse(query);
    return this.reviewService.getReviews(validatedQuery);
  }

  @Get('residence/:residenceId/stats')
  @PublicEndpoint()
  @ApiOperation({
    summary: "Obtenir les statistiques des avis d'une résidence",
  })
  @ApiResponse({
    status: 200,
    description: 'Statistiques des avis de la résidence',
    type: Object,
  })
  async getResidenceStats(
    @Param('residenceId', ParseIntPipe) residenceId: number,
  ): Promise<IReviewStatsDto> {
    return this.reviewService.getResidenceStats(residenceId);
  }

  @Get(':reviewId')
  @PublicEndpoint()
  @ApiOperation({ summary: 'Obtenir un avis par ID' })
  @ApiResponse({
    status: 200,
    description: "Détails de l'avis",
  })
  @ApiResponse({ status: 404, description: 'Avis non trouvé' })
  async getReviewById(
    @Param('reviewId', ParseIntPipe) reviewId: number,
    @Query('includeResponses') includeResponses?: string,
  ): Promise<IReview> {
    const includeResp = includeResponses === 'true';
    return this.reviewService.getReviewById(reviewId, includeResp);
  }

  @Get(':reviewId/responses')
  @PublicEndpoint()
  @ApiOperation({ summary: "Obtenir les réponses d'un avis" })
  @ApiResponse({
    status: 200,
    description: 'Liste des réponses',
  })
  async getResponses(
    @Param('reviewId', ParseIntPipe) reviewId: number,
  ): Promise<IReviewResponse[]> {
    return this.reviewService.getResponses(reviewId);
  }

  /**
   * ===== ENDPOINTS AUTHENTIFIÉS =====
   */

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un nouvel avis' })
  @ApiResponse({
    status: 201,
    description: 'Avis créé avec succès',
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Action interdite' })
  @ApiResponse({
    status: 409,
    description: 'Avis déjà existant pour cette résidence',
  })
  async createReview(
    @CurrentSystemUser() user: { id: number },
    @Body() createReviewDto: ICreateReviewDto,
  ): Promise<IReview> {
    // Validation du DTO
    const validatedDto = createReviewSchema.parse(createReviewDto);
    return this.reviewService.createReview(user.id, validatedDto);
  }

  @Put(':reviewId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour un avis' })
  @ApiResponse({
    status: 200,
    description: 'Avis mis à jour avec succès',
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Action interdite' })
  @ApiResponse({ status: 404, description: 'Avis non trouvé' })
  async updateReview(
    @Param('reviewId', ParseIntPipe) reviewId: number,
    @CurrentSystemUser() user: { id: number },
    @Body() updateReviewDto: IUpdateReviewDto,
  ): Promise<IReview> {
    // Validation du DTO
    const validatedDto = updateReviewSchema.parse(updateReviewDto);
    return this.reviewService.updateReview(reviewId, user.id, validatedDto);
  }

  @Delete(':reviewId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un avis' })
  @ApiResponse({
    status: 204,
    description: 'Avis supprimé avec succès',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Action interdite' })
  @ApiResponse({ status: 404, description: 'Avis non trouvé' })
  async deleteReview(
    @Param('reviewId', ParseIntPipe) reviewId: number,
    @CurrentSystemUser() user: { id: number },
  ): Promise<void> {
    return this.reviewService.deleteReview(reviewId, user.id);
  }

  /**
   * ===== GESTION DES RÉPONSES =====
   */

  @Post('responses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une réponse à un avis' })
  @ApiResponse({
    status: 201,
    description: 'Réponse créée avec succès',
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 404, description: 'Avis non trouvé' })
  async createResponse(
    @CurrentSystemUser() user: { id: number },
    @Body() createResponseDto: ICreateResponseDto,
  ): Promise<IReviewResponse> {
    // Validation du DTO
    const validatedDto = createResponseSchema.parse(createResponseDto);
    return this.reviewService.createResponse(user.id, validatedDto);
  }

  @Put('responses/:responseId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour une réponse' })
  @ApiResponse({
    status: 200,
    description: 'Réponse mise à jour avec succès',
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Action interdite' })
  @ApiResponse({ status: 404, description: 'Réponse non trouvée' })
  async updateResponse(
    @Param('responseId', ParseIntPipe) responseId: number,
    @CurrentSystemUser() user: { id: number },
    @Body() updateResponseDto: IUpdateResponseDto,
  ): Promise<IReviewResponse> {
    // Validation du DTO
    const validatedDto = updateResponseSchema.parse(updateResponseDto);
    return this.reviewService.updateResponse(responseId, user.id, validatedDto);
  }

  @Delete('responses/:responseId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer une réponse' })
  @ApiResponse({
    status: 204,
    description: 'Réponse supprimée avec succès',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Action interdite' })
  @ApiResponse({ status: 404, description: 'Réponse non trouvée' })
  async deleteResponse(
    @Param('responseId', ParseIntPipe) responseId: number,
    @CurrentSystemUser() user: { id: number },
  ): Promise<void> {
    return this.reviewService.deleteResponse(responseId, user.id);
  }

  /**
   * ===== ENDPOINTS DE MODÉRATION (ADMIN SEULEMENT) =====
   */

  @Put(':reviewId/moderate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @CustomRole([ROLES_ENUM.ADMIN])
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modérer un avis (Admin seulement)' })
  @ApiResponse({
    status: 200,
    description: 'Avis modéré avec succès',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permissions insuffisantes' })
  @ApiResponse({ status: 404, description: 'Avis non trouvé' })
  async moderateReview(
    @Param('reviewId', ParseIntPipe) reviewId: number,
    @CurrentSystemUser() user: { id: number },
    @Body() moderationDto: { status: ReviewStatus; moderationNote?: string },
  ): Promise<IReview> {
    return this.reviewService.moderateReview(
      reviewId,
      user.id,
      moderationDto.status,
      moderationDto.moderationNote,
    );
  }

  @Put('responses/:responseId/moderate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @CustomRole([ROLES_ENUM.ADMIN])
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modérer une réponse (Admin seulement)' })
  @ApiResponse({
    status: 200,
    description: 'Réponse modérée avec succès',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permissions insuffisantes' })
  @ApiResponse({ status: 404, description: 'Réponse non trouvée' })
  async moderateResponse(
    @Param('responseId', ParseIntPipe) responseId: number,
    @CurrentSystemUser() user: { id: number },
    @Body() moderationDto: { status: ResponseStatus; moderationNote?: string },
  ): Promise<IReviewResponse> {
    return this.reviewService.moderateResponse(
      responseId,
      user.id,
      moderationDto.status,
      moderationDto.moderationNote,
    );
  }

  /**
   * ===== ENDPOINTS ADMIN POUR LA GESTION =====
   */

  @Get('admin/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @CustomRole([ROLES_ENUM.ADMIN])
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtenir les avis en attente de modération' })
  @ApiResponse({
    status: 200,
    description: 'Liste des avis en attente',
  })
  async getPendingReviews(@Query() query: IReviewQueryDto) {
    const adminQuery = {
      ...query,
      status: ReviewStatus.PENDING,
    };
    return this.reviewService.getReviews(adminQuery);
  }

  @Get('admin/flagged')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @CustomRole([ROLES_ENUM.ADMIN])
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtenir les avis signalés' })
  @ApiResponse({
    status: 200,
    description: 'Liste des avis signalés',
  })
  async getFlaggedReviews(@Query() query: IReviewQueryDto) {
    const adminQuery = {
      ...query,
      status: ReviewStatus.REJECTED,
    };
    return this.reviewService.getReviews(adminQuery);
  }
}
