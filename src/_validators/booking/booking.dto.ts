import { createZodDto } from 'nestjs-zod';
import {
  createBookingSchema,
  cancelBookingSchema,
  bookingQuerySchema,
  calculatePriceSchema,
} from './booking.schema';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty()
  residenceId!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  checkInDate!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  checkOutDate!: Date;

  @ApiProperty()
  numberOfGuests!: number;

  @ApiPropertyOptional()
  guestNotes?: string;

  @ApiPropertyOptional()
  specialRequests?: string;
}

export class CancelBookingDto {
  @ApiPropertyOptional({ maxLength: 500 })
  cancellationReason?: string;

  @ApiProperty({ default: false })
  requestRefund!: boolean;
}

export class BookingQueryDto {
  @ApiPropertyOptional()
  status?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  startDate?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  endDate?: Date;

  @ApiPropertyOptional()
  residenceId?: number;

  @ApiPropertyOptional({ default: 1 })
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  limit?: number;
}

export class CalculatePriceDto {
  @ApiProperty()
  residenceId!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  checkInDate!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  checkOutDate!: Date;
}
