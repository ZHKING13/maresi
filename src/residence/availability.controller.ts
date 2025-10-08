import {
  Controller,
  Post,
  Patch,
  Delete,
  Get,
  Param,
  Body,
} from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import {
  CreateAvailabilityDto,
  UpdateAvailabilityDto,
} from 'src/_validators/residence/availability.dto';
import { CustomSwaggerDecorator } from 'src/_decorators/setters/swagger.decorator';
import { availabilityResponseSchema } from 'src/_validators/residence/availability.schema';
import { AVAILABILITY_PATHS } from 'src/_paths/availability';

@Controller('residences')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post(AVAILABILITY_PATHS.CREATE)
  @CustomSwaggerDecorator({
    summary: 'Ajouter une disponibilité à une annonce',
    bodyDec: { payloadSchema: CreateAvailabilityDto.schema },
    resDec: { responseSchema: availabilityResponseSchema },
  })
  async create(@Body() dto: CreateAvailabilityDto) {
    return this.availabilityService.createAvailability(dto);
  }

  @Patch(AVAILABILITY_PATHS.UPDATE)
  @CustomSwaggerDecorator({
    summary: 'Modifier une disponibilité',
    bodyDec: { payloadSchema: UpdateAvailabilityDto.schema },
    resDec: { responseSchema: availabilityResponseSchema },
  })
  async update(@Param('id') id: string, @Body() dto: UpdateAvailabilityDto) {
    return this.availabilityService.updateAvailability(Number(id), dto);
  }

  @Delete(AVAILABILITY_PATHS.DELETE)
  @CustomSwaggerDecorator({
    summary: 'Supprimer une disponibilité',
    resDec: { responseSchema: availabilityResponseSchema },
  })
  async delete(@Param('id') id: string) {
    return this.availabilityService.deleteAvailability(Number(id));
  }

  @Get(AVAILABILITY_PATHS.LIST_BY_RESIDENCE)
  @CustomSwaggerDecorator({
    summary: "Lister les disponibilités d'une annonce",
    resDec: { responseSchema: availabilityResponseSchema },
  })
  async list(@Param('residenceId') residenceId: string) {
    return this.availabilityService.getAvailabilitiesByResidence(
      Number(residenceId),
    );
  }
}
