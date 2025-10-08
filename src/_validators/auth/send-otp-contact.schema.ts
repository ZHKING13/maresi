import { z } from 'zod';
import { ISendOtpContactBody } from './auth.model';

export const sendOtpContactSchema: z.ZodSchema<ISendOtpContactBody> = z
  .object({
    contact: z.string().min(1, 'Le contact ne peut pas être vide'),
    isEmail: z.boolean().optional(),
  })
  .strip();
