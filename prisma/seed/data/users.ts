import { User, UserStatus, } from '@prisma/client';

export const userData: Array<
  Pick<User, 'firstName' | 'lastName' | 'email' | 'image' | 'status' | 'phoneNumber' | 'dateOfBirth' >
> = [
  {
    firstName: 'ASM',
    lastName: 'AUTHOR',
    email: 'dev.zap@yopmail.com',
    image: 'https://randomuser.me/api',
    status: 'ACTIVE',
    phoneNumber: '1234567890',
    dateOfBirth: new Date('1990-01-01'),
  },
  {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@yopmail.com',
    image: 'https://randomuser.me/api',
    status: UserStatus.ACTIVE,
    phoneNumber: '1234567890',
    dateOfBirth: new Date('1990-01-01'),
  },
  {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@yopmail.com',
    image: 'https://randomuser.me/api',
    status: UserStatus.ACTIVE,
    phoneNumber: '1234567890',
    dateOfBirth: new Date('1990-01-01'),
  },
];
