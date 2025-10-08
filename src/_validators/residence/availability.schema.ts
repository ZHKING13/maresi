import { z } from 'zod';

export const createAvailabilitySchema = z.object({
  residenceId: z.number().int(),
  startDate:z.iso.datetime(),
  endDate:z.iso.datetime(),
});

export const updateAvailabilitySchema = createAvailabilitySchema.partial();

export const availabilityResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    id: z.number(),
    residenceId: z.number(),
    startDate: z.iso.datetime(),
    endDate: z.iso.datetime(),
    created: z.iso.datetime(),
    updated: z.iso.datetime(),
  }),
});
