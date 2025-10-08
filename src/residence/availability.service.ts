import { Injectable } from '@nestjs/common';
import { AvailabilityClient } from './availability.client';
import {
  CreateAvailabilityDto,
  UpdateAvailabilityDto,
} from 'src/_validators/residence/availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(private readonly availabilityClient: AvailabilityClient) {}

  async createAvailability(dto: CreateAvailabilityDto) {
    const created = await this.availabilityClient.createAvailability(dto);
    return {
      message: 'Disponibilité ajoutée',
      data: created,
    };
  }

  async updateAvailability(id: number, dto: UpdateAvailabilityDto) {
    const updated = await this.availabilityClient.updateAvailability(id, dto);
    return {
      message: 'Disponibilité modifiée',
      data: updated,
    };
  }

  async deleteAvailability(id: number) {
    await this.availabilityClient.deleteAvailability(id);
    return {
      message: 'Disponibilité supprimée',
      data: null,
    };
  }

  async getAvailabilitiesByResidence(residenceId: number) {
    const data =
      await this.availabilityClient.getAvailabilitiesByResidence(residenceId);
    return {
      message: 'Liste des disponibilités',
      data,
    };
  }
}
