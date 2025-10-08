/* eslint-disable @typescript-eslint/no-empty-object-type */
import { User } from '@prisma/client';
import { Request } from 'express';

export type ITokens = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
};

export type ICurrentSystemUser = Pick<
  User,
  | 'id'
  | 'firstName'
  | 'lastName'
  | 'phoneNumber'
  | 'email'
  | 'newEmail'
  | 'status'
  | 'avatar'
>;

export interface IAuthenticatedRequest extends Request {
  user: ICurrentSystemUser;
}

export type AccessOrRefreshJwtPayload = {
  sub: User['id'];
};

export type AccessOrRefreshJwtPayloadJwtPayloadDecoded =
  AccessOrRefreshJwtPayload & {
    iat: number;
    exp: number;
  };
export type ICurrentSystemUserId = Pick<User, 'id'>;

export type ICurrentSystemUserIdWithRt = ICurrentSystemUserId & {
  refreshToken: string;
};

export interface IAuthenticatedRequestWithRt extends Request {
  user: ICurrentSystemUserIdWithRt;
}

export type VerifyEmailJwtPayload = Pick<User, 'email'> & {
  sub: User['id'];
};

export type VerifyEmailJwtPayloadDecoded = VerifyEmailJwtPayload & {
  iat: number;
  exp: number;
};

export interface ICurrentSystemUserFromEmailJwt
  extends Pick<User, 'id' | 'email'> {}

export interface IAuthenticatedRequestFromEmailJwt extends Request {
  user: ICurrentSystemUserFromEmailJwt;
}

export interface IRegisterUserBody
  extends Pick<User, 'firstName' | 'lastName'> {
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  password: string;
}

export interface ILoginBody extends Pick<User, 'email'> {
  password: string;
}

export interface ISendVerifyEmailBody {
  email: string;
}

export interface IVerifyEmailBody {
  email: string;
}

export interface ISendVerifyNewEmailBody {
  newEmail: string;
}

export interface IChangePasswordBody {
  email: string;
  password: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface IChangeEmailBody extends Pick<User, 'email'> {
  password: string;
  newEmail: string;
}

export interface ISendOtpContactBody {
  contact: string;
  isEmail?: boolean;
}

export interface ISendOtpEmailBody {
  email: string;
}

export interface IVerifyOTPBody {
  otpCode: number;
  contact: string;
}

export interface IVerifyEmailOTPBody {
  otpCode: number;
  email: string;
}

// Interface pour la compatibilité avec l'ancienne API
export interface IVerifyPhoneOTPBody {
  otpCode: number;
  phoneNumber: string;
}

export interface IResetPasswordBody {
  otpCode: number;
  email: string;
  newPassword: string;
  confirmNewPassword: string;
}

/*************  Responses  ***************/
export interface IRegisterUserResponse extends User {}

export interface ILoginUserResponse {
  user: User;
  tokens: ITokens;
}

export interface IRefreshTokenResponse extends ILoginUserResponse {}
