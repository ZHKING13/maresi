import {
  Booking,
  BookingStatus,
  BookingPaymentStatus,
  RefundStatus,
} from '@prisma/client';

export interface IBooking extends Booking {}

export interface ICreateBookingBody {
  residenceId: number;
  checkInDate: string | Date;
  checkOutDate: string | Date;
  numberOfGuests: number;
  guestNotes?: string;
  specialRequests?: string;
}

export interface IBookingCalculation {
  pricePerNight: number;
  numberOfNights: number;
  subtotal: number;
  serviceFee: number;
  totalPrice: number;
}

export interface IBookingWithDetails extends IBooking {
  residence?: {
    id: number;
    title: string;
    owner: {
      id: number;
      firstName: string;
      lastName: string;
    };
  };
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string | null;
    phoneNumber: string | null;
  };
}

export interface ICancelBookingBody {
  cancellationReason?: string;
  requestRefund: boolean;
}

export interface IBookingQuery {
  status?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  residenceId?: number;
  page?: number;
  limit?: number;
}

export interface ICalculatePriceBody {
  residenceId: number;
  checkInDate: string | Date;
  checkOutDate: string | Date;
}

export { BookingStatus, BookingPaymentStatus, RefundStatus };
