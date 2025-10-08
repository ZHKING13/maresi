import { z } from 'zod';

export const residenceResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    price: z.number(),
    status: z.string(),
    lat: z.number(),
    lng: z.number(),
    residenceTypeId: z.number(),
    photos: z.array(z.string()),
    rules: z.array(z.string()),
    specialConditions: z.array(z.string()),
    equipments: z.array(z.string()),
    hostId: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    // Ajoutez ici d'autres champs selon le modèle Residence
  }),
});
