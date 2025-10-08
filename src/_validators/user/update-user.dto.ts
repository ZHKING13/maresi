import { createZodDto } from 'nestjs-zod';
import { updateUserSchema } from './user.schema';

export class UpdateUserDto extends createZodDto(updateUserSchema) {}
