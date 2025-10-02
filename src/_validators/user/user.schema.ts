import { z } from 'zod';
import { IGetUserByIdResponse } from './user.model';

export const getUserByIdResponseSchema: z.ZodSchema<IGetUserByIdResponse> =
  z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    image: z.string(),
    phoneNumber: z.string(),
  });
