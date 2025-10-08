import { Residence } from '@prisma/client';

export interface IApiResponse<T = any> {
  message: string;
  data: T;
}

export class ResidenceResponseDto implements IApiResponse<Residence> {
  message: string;
  data: Residence;

  constructor(data: Residence, message = 'Annonce créée avec succès') {
    this.data = data;
    this.message = message;
  }
}
