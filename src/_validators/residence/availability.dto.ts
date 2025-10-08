import { createZodDto } from 'nestjs-zod';
import {
  createAvailabilitySchema,
  updateAvailabilitySchema,
} from './availability.schema';

export class CreateAvailabilityDto extends createZodDto(
  createAvailabilitySchema,
) {}
export class UpdateAvailabilityDto extends createZodDto(
  updateAvailabilitySchema,
) {}
