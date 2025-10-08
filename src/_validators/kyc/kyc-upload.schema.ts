import { z } from 'zod';

export const kycUploadSchema = z.object({
  documentType: z.string().min(2),
  kycFor: z.enum(['USER', 'HOST']),
  document: z.any(), // Fichier (buffer ou stream)
  selfie: z.any().optional(), // Fichier (buffer ou stream)
});

export type KycUploadDto = z.infer<typeof kycUploadSchema>;
