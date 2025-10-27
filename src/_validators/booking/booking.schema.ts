import { z } from 'zod';
import {
  ICreateBookingBody,
  ICancelBookingBody,
  IBookingCalculation,
  IBookingQuery,
  ICalculatePriceBody,
} from './booking.model';

export const createBookingSchema = z
  .object({
    residenceId: z.number().int().positive('Residence ID must be positive'),
    checkInDate: z.string().datetime('Invalid check-in date format'),
    checkOutDate: z.string().datetime('Invalid check-out date format'),
    numberOfGuests: z
      .number()
      .int()
      .positive('Number of guests must be at least 1'),
    guestNotes: z.string().max(1000).optional(),
    specialRequests: z.string().max(500).optional(),
  })
  .refine((data) => new Date(data.checkOutDate) > new Date(data.checkInDate), {
    message: 'Check-out date must be after check-in date',
    path: ['checkOutDate'],
  });

export const cancelBookingSchema = z.object({
  cancellationReason: z.string().max(500).optional(),
  requestRefund: z.boolean().default(false),
});

export const bookingQuerySchema = z.object({
  status: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  residenceId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const calculatePriceSchema = z.object({
  residenceId: z.number().int().positive('Residence ID must be positive'),
  checkInDate: z.string().datetime('Invalid check-in date format'),
  checkOutDate: z.string().datetime('Invalid check-out date format'),
});
