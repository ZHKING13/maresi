import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAvailabilityDto } from 'src/_validators/residence/availability.dto';

@Injectable()
export class AvailabilityClient {
  constructor(private readonly prisma: PrismaService) {}

  async createAvailability(dto: CreateAvailabilityDto) {
    return this.prisma.availability.create({ data: dto });
  }

  async updateAvailability(id: number, dto: Partial<CreateAvailabilityDto>) {
    return this.prisma.availability.update({ where: { id }, data: dto });
  }

  async deleteAvailability(id: number) {
    return this.prisma.availability.delete({ where: { id } });
  }

  async getAvailabilitiesByResidence(residenceId: number) {
    return this.prisma.availability.findMany({ where: { residenceId } });
  }
}
