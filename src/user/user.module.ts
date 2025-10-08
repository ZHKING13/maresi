import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserClient } from './user.client';
import { PasswordModule } from 'src/password/password.module';
import { MinioModule } from 'src/minio/minio.module';

@Module({
  imports: [PasswordModule,MinioModule],
  controllers: [UserController],
  providers: [UserService, UserClient],
  exports: [UserService],
})
export class UserModule {}
