import { Module } from '@nestjs/common';

import { MinioModule } from '../minio/minio.module';

import { ResidenceController } from './residence.controller';
import { ResidenceService } from './residence.service';
import { ResidenceClient } from './residence.client';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { AvailabilityClient } from './availability.client';

@Module({
  imports: [MinioModule],
  controllers: [ResidenceController, AvailabilityController],
  providers: [
    ResidenceService,
    ResidenceClient,
    AvailabilityService,
    AvailabilityClient,
  ],
  exports: [ResidenceService, AvailabilityService],
})
export class ResidenceModule {}
