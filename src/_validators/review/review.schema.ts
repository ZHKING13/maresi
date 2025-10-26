import { z } from 'zod';
import { ReviewStatus, ResponseType, ResponseStatus } from './review.model';

// Schémas pour la création d'un avis
export const createReviewSchema = z.object({
  residenceId: z.number().int().positive("L'ID de la résidence est requis"),
  rating: z
    .number()
    .int()
    .min(1, 'La note doit être entre 1 et 5')
    .max(5, 'La note doit être entre 1 et 5'),
  comment: z
    .string()
    .min(10, 'Le commentaire doit contenir au moins 10 caractères')
    .max(2000, 'Le commentaire ne peut pas dépasser 2000 caractères')
    .optional(),
  cleanlinessRating: z.number().int().min(1).max(5).optional(),
  locationRating: z.number().int().min(1).max(5).optional(),
  valueForMoneyRating: z.number().int().min(1).max(5).optional(),
  serviceRating: z.number().int().min(1).max(5).optional(),
});

// Schémas pour la mise à jour d'un avis
export const updateReviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().min(10).max(2000).optional(),
    cleanlinessRating: z.number().int().min(1).max(5).optional(),
    locationRating: z.number().int().min(1).max(5).optional(),
    valueForMoneyRating: z.number().int().min(1).max(5).optional(),
    serviceRating: z.number().int().min(1).max(5).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Au moins un champ doit être fourni pour la mise à jour',
  });

// Schémas pour la création d'une réponse
export const createResponseSchema = z.object({
  reviewId: z.number().int().positive("L'ID de l'avis est requis"),
  content: z
    .string()
    .min(5, 'La réponse doit contenir au moins 5 caractères')
    .max(1000, 'La réponse ne peut pas dépasser 1000 caractères'),
  responseType: z.enum(ResponseType).optional(),
});

// Schémas pour la mise à jour d'une réponse
export const updateResponseSchema = z.object({
  content: z
    .string()
    .min(5, 'La réponse doit contenir au moins 5 caractères')
    .max(1000, 'La réponse ne peut pas dépasser 1000 caractères'),
});

// Schémas pour les requêtes de recherche
export const reviewQuerySchema = z.object({
  residenceId: z.number().int().positive().optional(),
  userId: z.number().int().positive().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  status: z.enum(ReviewStatus).optional(),
  minRating: z.number().int().min(1).max(5).optional(),
  maxRating: z.number().int().min(1).max(5).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  sortBy: z.enum(['created', 'rating', 'updated']).default('created'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeResponses: z.boolean().default(true),
});

// Schémas pour la modération
export const reviewModerationSchema = z.object({
  status: z.enum(ReviewStatus),
  moderationNote: z
    .string()
    .max(500, 'La note de modération ne peut pas dépasser 500 caractères')
    .optional(),
});

export const responseModerationSchema = z.object({
  status: z.enum(ResponseStatus),
  moderationNote: z
    .string()
    .max(500, 'La note de modération ne peut pas dépasser 500 caractères')
    .optional(),
});

// Schémas pour les paramètres de route
export const reviewParamsSchema = z.object({
  id: z.string().transform((val) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num <= 0) {
      throw new Error("L'ID doit être un nombre positif");
    }
    return num;
  }),
});

export const responseParamsSchema = z.object({
  id: z.string().transform((val) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num <= 0) {
      throw new Error("L'ID doit être un nombre positif");
    }
    return num;
  }),
});

export const residenceParamsSchema = z.object({
  residenceId: z.string().transform((val) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num <= 0) {
      throw new Error("L'ID de la résidence doit être un nombre positif");
    }
    return num;
  }),
});

// Types inférés des schémas
export type CreateReviewDto = z.infer<typeof createReviewSchema>;
export type UpdateReviewDto = z.infer<typeof updateReviewSchema>;
export type CreateResponseDto = z.infer<typeof createResponseSchema>;
export type UpdateResponseDto = z.infer<typeof updateResponseSchema>;
export type ReviewQueryDto = z.infer<typeof reviewQuerySchema>;
export type ReviewModerationDto = z.infer<typeof reviewModerationSchema>;
export type ResponseModerationDto = z.infer<typeof responseModerationSchema>;
export type ReviewParamsDto = z.infer<typeof reviewParamsSchema>;
export type ResponseParamsDto = z.infer<typeof responseParamsSchema>;
export type ResidenceParamsDto = z.infer<typeof residenceParamsSchema>;
