import { createZodDto } from 'nestjs-zod';
import {
  createResidenceSchema,
  updateResidenceSchema,
} from './residence.schema';

export class CreateResidenceDto extends createZodDto(createResidenceSchema) {}
export class UpdateResidenceDto extends createZodDto(updateResidenceSchema) {}
