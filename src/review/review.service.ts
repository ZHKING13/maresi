import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  IReview,
  IReviewResponse,
  ICreateReviewDto,
  IUpdateReviewDto,
  ICreateResponseDto,
  IUpdateResponseDto,
  IReviewQueryDto,
  IReviewStatsDto,
  ReviewStatus,
  ResponseType,
  ResponseStatus,
} from '../_validators/review';

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * ===== GESTION DES AVIS =====
   */

  /**
   * Créer un nouvel avis
   */
  async createReview(
    userId: number,
    createReviewDto: ICreateReviewDto,
  ): Promise<IReview> {
    const { residenceId, ...reviewData } = createReviewDto;

    // Vérifier si l'utilisateur a déjà laissé un avis pour cette résidence
    const existingReview = await this.prisma.review.findUnique({
      where: {
        userId_residenceId: {
          userId,
          residenceId,
        },
      },
    });

    if (existingReview) {
      throw new ConflictException(
        'Vous avez déjà laissé un avis pour cette résidence',
      );
    }

    // Vérifier si la résidence existe
    const residence = await this.prisma.residence.findUnique({
      where: { id: residenceId },
    });

    if (!residence) {
      throw new NotFoundException('Résidence non trouvée');
    }

    // Vérifier si l'utilisateur n'est pas le propriétaire
    if (residence.ownerId === userId) {
      throw new ForbiddenException(
        'Vous ne pouvez pas laisser un avis sur votre propre résidence',
      );
    }

    // TODO: Vérifier si l'utilisateur a effectué un séjour dans cette résidence
    // Cette logique dépendra de votre système de réservation

    const review = await this.prisma.review.create({
      data: {
        userId,
        residenceId,
        ...reviewData,
        status: ReviewStatus.PUBLISHED, // Par défaut publié, peut être modifié selon vos règles
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        residence: {
          select: {
            id: true,
            title: true,
          },
        },
        responses: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
          orderBy: { created: 'asc' },
        },
      },
    });

    this.logger.log(`Review created: ${review.id} by user ${userId}`);
    return this.mapReviewToInterface(review);
  }

  /**
   * Obtenir les avis avec filtres et pagination
   */
  async getReviews(query: IReviewQueryDto): Promise<{
    reviews: IReview[];
    total: number;
    pagination: {
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const {
      residenceId,
      userId,
      rating,
      status,
      minRating,
      maxRating,
      limit = 20,
      offset = 0,
      sortBy = 'created',
      sortOrder = 'desc',
      includeResponses = true,
    } = query;

    const where: any = {};

    if (residenceId) where.residenceId = residenceId;
    if (userId) where.userId = userId;
    if (rating) where.rating = rating;
    if (status) where.status = status;

    if (minRating || maxRating) {
      where.rating = {};
      if (minRating) where.rating.gte = minRating;
      if (maxRating) where.rating.lte = maxRating;
    }

    // Par défaut, ne montrer que les avis publiés pour les utilisateurs normaux
    if (!status) {
      where.status = ReviewStatus.PUBLISHED;
    }

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          residence: {
            select: {
              id: true,
              title: true,
            },
          },
          responses: includeResponses
            ? {
                where: {
                  status: ResponseStatus.PUBLISHED,
                },
                include: {
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      avatar: true,
                    },
                  },
                },
                orderBy: { created: 'asc' },
              }
            : false,
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    const page = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(total / limit);

    return {
      reviews: reviews.map((review) => this.mapReviewToInterface(review)),
      total,
      pagination: {
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Obtenir un avis par ID
   */
  async getReviewById(
    reviewId: number,
    includeResponses = true,
  ): Promise<IReview> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        residence: {
          select: {
            id: true,
            title: true,
          },
        },
        responses: includeResponses
          ? {
              where: {
                status: ResponseStatus.PUBLISHED,
              },
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    avatar: true,
                  },
                },
              },
              orderBy: { created: 'asc' },
            }
          : false,
      },
    });

    if (!review) {
      throw new NotFoundException('Avis non trouvé');
    }

    return this.mapReviewToInterface(review);
  }

  /**
   * Mettre à jour un avis
   */
  async updateReview(
    reviewId: number,
    userId: number,
    updateReviewDto: IUpdateReviewDto,
  ): Promise<IReview> {
    const existingReview = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!existingReview) {
      throw new NotFoundException('Avis non trouvé');
    }

    if (existingReview.userId !== userId) {
      throw new ForbiddenException(
        'Vous ne pouvez modifier que vos propres avis',
      );
    }

    const updatedReview = await this.prisma.review.update({
      where: { id: reviewId },
      data: updateReviewDto,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        residence: {
          select: {
            id: true,
            title: true,
          },
        },
        responses: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
          orderBy: { created: 'asc' },
        },
      },
    });

    this.logger.log(`Review updated: ${reviewId} by user ${userId}`);
    return this.mapReviewToInterface(updatedReview);
  }

  /**
   * Supprimer un avis
   */
  async deleteReview(reviewId: number, userId: number): Promise<void> {
    const existingReview = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!existingReview) {
      throw new NotFoundException('Avis non trouvé');
    }

    if (existingReview.userId !== userId) {
      throw new ForbiddenException(
        'Vous ne pouvez supprimer que vos propres avis',
      );
    }

    await this.prisma.review.delete({
      where: { id: reviewId },
    });

    this.logger.log(`Review deleted: ${reviewId} by user ${userId}`);
  }

  /**
   * ===== GESTION DES RÉPONSES =====
   */

  /**
   * Créer une réponse à un avis
   */
  async createResponse(
    userId: number,
    createResponseDto: ICreateResponseDto,
  ): Promise<IReviewResponse> {
    const { reviewId, content } = createResponseDto;

    // Vérifier si l'avis existe
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        residence: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Avis non trouvé');
    }

    // Déterminer le type de réponse
    let responseType = ResponseType.CLIENT;
    if (review.residence.ownerId === userId) {
      responseType = ResponseType.OWNER;
    }
    // TODO: Vérifier si l'utilisateur est admin pour ResponseType.ADMIN

    const response = await this.prisma.reviewResponse.create({
      data: {
        reviewId,
        userId,
        content,
        responseType,
        status: ResponseStatus.PUBLISHED, // Par défaut publié
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    this.logger.log(`Response created: ${response.id} by user ${userId}`);
    return this.mapResponseToInterface(response);
  }

  /**
   * Obtenir les réponses d'un avis
   */
  async getResponses(reviewId: number): Promise<IReviewResponse[]> {
    const responses = await this.prisma.reviewResponse.findMany({
      where: {
        reviewId,
        status: ResponseStatus.PUBLISHED,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
      orderBy: { created: 'asc' },
    });

    return responses.map((response) => this.mapResponseToInterface(response));
  }

  /**
   * Mettre à jour une réponse
   */
  async updateResponse(
    responseId: number,
    userId: number,
    updateResponseDto: IUpdateResponseDto,
  ): Promise<IReviewResponse> {
    const existingResponse = await this.prisma.reviewResponse.findUnique({
      where: { id: responseId },
    });

    if (!existingResponse) {
      throw new NotFoundException('Réponse non trouvée');
    }

    if (existingResponse.userId !== userId) {
      throw new ForbiddenException(
        'Vous ne pouvez modifier que vos propres réponses',
      );
    }

    const updatedResponse = await this.prisma.reviewResponse.update({
      where: { id: responseId },
      data: updateResponseDto,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    this.logger.log(`Response updated: ${responseId} by user ${userId}`);
    return this.mapResponseToInterface(updatedResponse);
  }

  /**
   * Supprimer une réponse
   */
  async deleteResponse(responseId: number, userId: number): Promise<void> {
    const existingResponse = await this.prisma.reviewResponse.findUnique({
      where: { id: responseId },
    });

    if (!existingResponse) {
      throw new NotFoundException('Réponse non trouvée');
    }

    if (existingResponse.userId !== userId) {
      throw new ForbiddenException(
        'Vous ne pouvez supprimer que vos propres réponses',
      );
    }

    await this.prisma.reviewResponse.delete({
      where: { id: responseId },
    });

    this.logger.log(`Response deleted: ${responseId} by user ${userId}`);
  }

  /**
   * ===== STATISTIQUES =====
   */

  /**
   * Obtenir les statistiques d'une résidence
   */
  async getResidenceStats(residenceId: number): Promise<IReviewStatsDto> {
    const reviews = await this.prisma.review.findMany({
      where: {
        residenceId,
        status: ReviewStatus.PUBLISHED,
      },
      select: {
        rating: true,
        cleanlinessRating: true,
        locationRating: true,
        valueForMoneyRating: true,
        serviceRating: true,
      },
    });

    if (reviews.length === 0) {
      return {
        residenceId,
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        detailedRatings: {
          cleanliness: 0,
          location: 0,
          valueForMoney: 0,
          service: 0,
        },
      };
    }

    // Calcul de la moyenne générale
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = Math.round((totalRating / reviews.length) * 10) / 10;

    // Distribution des notes
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((review) => {
      ratingDistribution[review.rating as keyof typeof ratingDistribution]++;
    });

    // Moyennes détaillées
    const detailedRatings = {
      cleanliness: this.calculateAverage(
        reviews.map((r) => r.cleanlinessRating).filter(Boolean) as number[],
      ),
      location: this.calculateAverage(
        reviews.map((r) => r.locationRating).filter(Boolean) as number[],
      ),
      valueForMoney: this.calculateAverage(
        reviews.map((r) => r.valueForMoneyRating).filter(Boolean) as number[],
      ),
      service: this.calculateAverage(
        reviews.map((r) => r.serviceRating).filter(Boolean) as number[],
      ),
    };

    return {
      residenceId,
      totalReviews: reviews.length,
      averageRating,
      ratingDistribution,
      detailedRatings,
    };
  }

  /**
   * ===== MODÉRATION (pour les admins) =====
   */

  /**
   * Modérer un avis
   */
  async moderateReview(
    reviewId: number,
    moderatorId: number,
    status: ReviewStatus,
    moderationNote?: string,
  ): Promise<IReview> {
    const updatedReview = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        status,
        moderatorId,
        moderationNote,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        residence: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    this.logger.log(
      `Review moderated: ${reviewId} -> ${status} by ${moderatorId}`,
    );
    return this.mapReviewToInterface(updatedReview);
  }

  /**
   * Modérer une réponse
   */
  async moderateResponse(
    responseId: number,
    moderatorId: number,
    status: ResponseStatus,
    moderationNote?: string,
  ): Promise<IReviewResponse> {
    const updatedResponse = await this.prisma.reviewResponse.update({
      where: { id: responseId },
      data: {
        status,
        moderatorId,
        moderationNote,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    this.logger.log(
      `Response moderated: ${responseId} -> ${status} by ${moderatorId}`,
    );
    return this.mapResponseToInterface(updatedResponse);
  }

  /**
   * ===== MÉTHODES PRIVÉES =====
   */

  private mapReviewToInterface(review: any): IReview {
    return {
      id: review.id,
      userId: review.userId,
      residenceId: review.residenceId,
      rating: review.rating,
      comment: review.comment,
      cleanlinessRating: review.cleanlinessRating,
      locationRating: review.locationRating,
      valueForMoneyRating: review.valueForMoneyRating,
      serviceRating: review.serviceRating,
      status: review.status as ReviewStatus,
      moderatorId: review.moderatorId,
      moderationNote: review.moderationNote,
      created: review.created,
      updated: review.updated,
      user: review.user,
      residence: review.residence,
      responses: review.responses?.map((response) =>
        this.mapResponseToInterface(response),
      ),
    };
  }

  private mapResponseToInterface(response: any): IReviewResponse {
    return {
      id: response.id,
      reviewId: response.reviewId,
      userId: response.userId,
      content: response.content,
      responseType: response.responseType as ResponseType,
      status: response.status as ResponseStatus,
      moderatorId: response.moderatorId,
      moderationNote: response.moderationNote,
      created: response.created,
      updated: response.updated,
      user: response.user,
    };
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return Math.round((sum / values.length) * 10) / 10;
  }
}
