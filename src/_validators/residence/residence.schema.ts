import { z } from 'zod';

export const createResidenceSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10),
  pricePerNight: z.number().positive(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  residenceTypeId: z.number().int(),
  ruleIds: z.array(z.number().int()).min(1),
  specialConditionIds: z.array(z.number().int()).optional(),
  equipmentIds: z.array(z.number().int()).optional(),
  // mediaIds supprimé pour l'option 1
});

export const updateResidenceSchema = createResidenceSchema.partial();
