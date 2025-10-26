export const REVIEW_PATHS = {
  // Routes publiques
  GET_REVIEWS: '/reviews',
  GET_REVIEW_BY_ID: '/reviews/:reviewId',
  GET_RESIDENCE_STATS: '/reviews/residence/:residenceId/stats',
  GET_RESPONSES: '/reviews/:reviewId/responses',

  // Routes authentifiées
  CREATE_REVIEW: '/reviews',
  UPDATE_REVIEW: '/reviews/:reviewId',
  DELETE_REVIEW: '/reviews/:reviewId',

  // Gestion des réponses
  CREATE_RESPONSE: '/reviews/responses',
  UPDATE_RESPONSE: '/reviews/responses/:responseId',
  DELETE_RESPONSE: '/reviews/responses/:responseId',

  // Modération (Admin)
  MODERATE_REVIEW: '/reviews/:reviewId/moderate',
  MODERATE_RESPONSE: '/reviews/responses/:responseId/moderate',

  // Administration
  GET_PENDING_REVIEWS: '/reviews/admin/pending',
  GET_REJECTED_REVIEWS: '/reviews/admin/flagged',
} as const;
