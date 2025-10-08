// ...existing code...
import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserClient } from './user.client';
import { PasswordService } from 'src/password/password.service';
import { User } from '@prisma/client';
import { IGetUserByIdResponse } from 'src/_validators/user/user.model';
import { MinioService } from 'src/minio/minio.service';

@Injectable()
export class UserService {
  constructor(
    private readonly userClient: UserClient,
    private readonly passwordService: PasswordService,
    private readonly minioService: MinioService, // Inject MinioService
  ) {}

  // Create user or throw
  // Upload and update user profile image
  public async updateUserProfileImage(
    userId: number,
    file: Express.Multer.File,
  ): Promise<User> {
    const bucket = 'user-profile-images';
    const fileName = `${userId}_${Date.now()}_${file.originalname}`;
    const uploadResult = await this.minioService.uploadFile(
      bucket,
      fileName,
      file.buffer,
      file.mimetype,
    );
    if (!uploadResult.url) {
      throw new Error('Minio upload did not return a URL');
    }
    return this.userClient.updateUserAvatar(userId, uploadResult.url);
  }
  public async createUserOrThrow({
    firstName,
    lastName,
    email,
    password: plainTextPassword,
    phoneNumber,
    dateOfBirth,
  }: Pick<User, 'firstName' | 'lastName'> & {
    email?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    password: string;
  }): Promise<User> {
    if (email) {
      await this.checkIfUserExistsByEmail(email);
    }

    if (phoneNumber) {
      await this.checkIfUserExistsByPhoneNumber(phoneNumber);
    }

    const createdUser = await this.userClient.createUserOrThrow({
      firstName,
      lastName,
      email,
      phoneNumber,
      dateOfBirth,
    });

    await this.passwordService.hashThenCreateOrUpdatePassword({
      userId: createdUser.id,
      plainTextPassword,
    });

    return createdUser;
  }

  // Check if user exists by email
  // Check if user exists by email
  public async checkIfUserExistsByEmail(email: User['email']): Promise<void> {
    if (!email) return;

    const userExist = await this.userClient.checkIfUserExistsByEmail(email);

    if (userExist) {
      return Promise.reject(
        new ConflictException(
          `UserService: user with email ${email} already exist`,
        ),
      );
    }
  }

  // Check if user exists by phone number
  public async checkIfUserExistsByPhoneNumber(
    phoneNumber: User['phoneNumber'],
  ): Promise<void> {
    if (!phoneNumber) return;

    const userExist =
      await this.userClient.checkIfUserExistsByPhoneNumber(phoneNumber);

    if (userExist) {
      return Promise.reject(
        new ConflictException(
          `UserService: user with phone number ${phoneNumber} already exist`,
        ),
      );
    }
  }

  // Get user by email or null
  public async getUserByEmailOrNull(
    email: User['email'],
  ): Promise<User | null> {
    return this.userClient.getUserByEmailOrNull(email);
  }

  // Get user by phone number or null
  public async getUserByPhoneNumberOrNull(
    phoneNumber: User['phoneNumber'],
  ): Promise<User | null> {
    return this.userClient.getUserByPhoneNumberOrNull(phoneNumber);
  }

  // Get user by contact (email or phone) or null
  public async getUserByContactOrNull({
    email,
    phoneNumber,
  }: {
    email?: string;
    phoneNumber?: string;
  }): Promise<User | null> {
    return this.userClient.getUserByContactOrNull({ email, phoneNumber });
  }

  // Update user status to active
  public async updateUserStatusToActive(userId: User['id']): Promise<void> {
    return this.userClient.updateUserStatusToActiveOrThrow(userId);
  }

  // Get user by id or null
  public async getUserByIdOrNull(userId: number): Promise<User | null> {
    return this.userClient.getUserByIdOrNull(userId);
  }

  // Check if change email is not allowed or throw
  public async checkIfChangeEmailIsNotAllowedOrThrow({
    id,
    email,
  }: Pick<User, 'id' | 'email'>): Promise<void> {
    // check if  if email is taken
    const isNotAllowed = await this.userClient.checkIfChangeEmailIsNotAllowed({
      id,
      email,
    });

    if (isNotAllowed) {
      return Promise.reject(
        new ForbiddenException(
          `UserService: checkIfChangeEmailIsNotAllowedOrThrow : email already used`,
        ),
      );
    }
  }

  // Change email
  public async changeEmail(
    userId: number,
    {
      newEmail,
      email,
      status,
    }: Partial<Pick<User, 'email' | 'newEmail' | 'status'>>,
  ): Promise<User> {
    const result = await this.userClient.changeEmailOrThrow(userId, {
      email,
      newEmail,
      status,
    });
    return result;
  }
  // Update user info (nom, téléphone, etc.)
  public async updateUserInfo(
    userId: number,
    data: Partial<
      Pick<User, 'firstName' | 'lastName' | 'phoneNumber' | 'dateOfBirth'>
    >,
  ): Promise<User> {
    return this.userClient.updateUserFieldsOrThrow(userId, data);
  }
  // Get all users
  public async getAllUsers(): Promise<User[]> {
    return this.userClient.getAllUsers();
  }

  // Get user by id
  public async getUserById(
    id: User['id'],
  ): Promise<IGetUserByIdResponse | null> {
    return this.userClient.getUserById(id);
  }
}
