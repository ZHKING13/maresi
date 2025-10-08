
import { z } from 'zod';
import { IGetUserByIdResponse } from './user.model';

export const getUserByIdResponseSchema: z.ZodSchema<IGetUserByIdResponse> =
  z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    avatar: z.string(),
    phoneNumber: z.string(),
  });
  export const updateUserSchema = z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phoneNumber: z.string().optional(),
    dateOfBirth: z.iso.datetime().optional(),
  });
