import { User, UserStatus } from '@prisma/client';

export const userData: Array<
  Pick<
    User,
    | 'firstName'
    | 'lastName'
    | 'email'
    | 'avatar'
    | 'status'
    | 'phoneNumber'
    | 'dateOfBirth'
  >
> = [
  {
    firstName: 'ASM',
    lastName: 'AUTHOR',
    email: 'dev.zap@yopmail.com',
    avatar: 'https://randomuser.me/api',
    status: 'ACTIVE',
    phoneNumber: '1234567890',
    dateOfBirth: new Date('1990-01-01').toISOString(),
  },
  {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@yopmail.com',
    avatar: 'https://randomuser.me/api',
    status: UserStatus.ACTIVE,
    phoneNumber: '1234567890',
    dateOfBirth: new Date('1990-01-01').toISOString(),
  },
  {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@yopmail.com',
    avatar: 'https://randomuser.me/api',
    status: UserStatus.ACTIVE,
    phoneNumber: '1234567890',
    dateOfBirth: new Date('1990-01-01').toISOString(),
  },
];
