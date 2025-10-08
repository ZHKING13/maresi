import { z } from 'zod';
import { createZodDto, ZodSerializerDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';
import { ISendOtpContactBody } from './auth.model';
import { sendOtpContactSchema } from './send-otp-contact.schema';

export class SendOtpContactBodyDto
  extends createZodDto(sendOtpContactSchema)
  implements ISendOtpContactBody
{
  @ApiProperty({
    description: 'Contact (email ou numéro de téléphone)',
    type: String,
  })
  contact: string;

  @ApiProperty({
    description: 'Indique si le contact est un email',
    type: Boolean,
    required: false,
  })
  isEmail?: boolean;
}
