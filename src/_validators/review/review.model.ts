export enum ReviewStatus {
  PENDING = 'PENDING',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED',
  HIDDEN = 'HIDDEN',
}

export enum ResponseType {
  CLIENT = 'CLIENT',
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
}

export enum ResponseStatus {
  PENDING = 'PENDING',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED',
  HIDDEN = 'HIDDEN',
}

export interface IReview {
  id: number;
  userId: number;
  residenceId: number;
  rating: number; // 1-5 étoiles
  comment?: string;

  // Critères détaillés
  cleanlinessRating?: number;
  locationRating?: number;
  valueForMoneyRating?: number;
  serviceRating?: number;

  // Statut et modération
  status: ReviewStatus;
  moderatorId?: number;
  moderationNote?: string;

  created: Date;
  updated: Date;

  // Relations
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  residence?: {
    id: number;
    title: string;
  };
  responses?: IReviewResponse[];
}

export interface IReviewResponse {
  id: number;
  reviewId: number;
  userId: number;
  content: string;
  responseType: ResponseType;
  status: ResponseStatus;
  moderatorId?: number;
  moderationNote?: string;
  created: Date;
  updated: Date;

  // Relations
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

export interface ICreateReviewDto {
  residenceId: number;
  rating: number;
  comment?: string;
  cleanlinessRating?: number;
  locationRating?: number;
  valueForMoneyRating?: number;
  serviceRating?: number;
}

export interface IUpdateReviewDto {
  rating?: number;
  comment?: string;
  cleanlinessRating?: number;
  locationRating?: number;
  valueForMoneyRating?: number;
  serviceRating?: number;
}

export interface ICreateResponseDto {
  reviewId: number;
  content: string;
  responseType?: ResponseType; // Sera déterminé automatiquement selon l'utilisateur
}

export interface IUpdateResponseDto {
  content: string;
}

export interface IReviewQueryDto {
  residenceId?: number;
  userId?: number;
  rating?: number;
  status?: ReviewStatus;
  minRating?: number;
  maxRating?: number;
  limit?: number;
  offset?: number;
  sortBy?: 'created' | 'rating' | 'updated';
  sortOrder?: 'asc' | 'desc';
  includeResponses?: boolean;
}

export interface IReviewStatsDto {
  residenceId: number;
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  detailedRatings: {
    cleanliness: number;
    location: number;
    valueForMoney: number;
    service: number;
  };
}

export interface IReviewModerationDto {
  reviewId: number;
  status: ReviewStatus;
  moderationNote?: string;
}

export interface IResponseModerationDto {
  responseId: number;
  status: ResponseStatus;
  moderationNote?: string;
}
