import { z } from 'zod';

export const residenceSearchQuerySchema = z.object({
  minLat: z.coerce.number().optional(),
  maxLat: z.coerce.number().optional(),
  minLng: z.coerce.number().optional(),
  maxLng: z.coerce.number().optional(),
  priceMin: z.coerce.number().optional(),
  priceMax: z.coerce.number().optional(),
  residenceTypeId: z.coerce.number().optional(),
  equipmentIds: z.array(z.coerce.number()).optional(),
  page: z.coerce.number().min(1).default(1).optional(),
  limit: z.coerce.number().min(1).max(200).default(20).optional(),
});
