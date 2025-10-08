/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ILoginBody,
  ILoginUserResponse,
  IRefreshTokenResponse,
  IRegisterUserBody,
  IResetPasswordBody,
  ISendOtpContactBody,
  ISendOtpEmailBody,
  ITokens,
  VerifyEmailJwtPayload,
} from 'src/_validators/auth/auth.model';
import { UserService } from 'src/user/user.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { jwtConstants } from './constants';
import { RefreshTokenService } from 'src/refresh-token/refresh-token.service';
import { User, UserStatus } from '@prisma/client';
import { PasswordService } from 'src/password/password.service';
import { HashService } from 'src/_utils/hash.util';
import { AUTH_PATHS } from 'src/_paths/auth';
import { EmailService } from 'src/email/email.service';
import verifyEmailEdm from 'src/email/assets/verifyEmailTemplate';
import { OtpAndSecretService } from 'src/otp-and-secret/otp-and-secret.service';
import { authenticator } from 'otplib';
import resetPasswordEdm from 'src/email/assets/resetPasswordEmailTemplate';
import { SmsService } from 'src/sms/sms.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly passwordService: PasswordService,
    private readonly emailService: EmailService,
    private readonly otpAndSecretService: OtpAndSecretService,
    private readonly smsService: SmsService,
  ) {}

  // Register
  public async register(registerPayload: IRegisterUserBody): Promise<User> {
    const createdUser = await this.userService.createUserOrThrow({
      firstName: registerPayload.firstName,
      lastName: registerPayload.lastName,
      email: registerPayload.email,
      password: registerPayload.password,
      phoneNumber: registerPayload.phoneNumber,
      dateOfBirth: registerPayload.dateOfBirth,
    });

    Logger.log(`AuthService: user with id: ${createdUser.id} created`);

    // Envoyer la vérification via email ou SMS selon la méthode fournie
    if (createdUser.email) {
      await this.sendVerifyEmailForNewUser({
        email: createdUser.email,
      });
    } else if (createdUser.phoneNumber) {
      await this.sendVerifySmsForNewUser({
        phoneNumber: createdUser.phoneNumber,
      });
    }

    return createdUser;
  }

  // Login
  public async login(loginPayload: ILoginBody): Promise<ILoginUserResponse> {
    // Vérifier si c'est un email ou un numéro de téléphone
    let user: User | null = null;

    if (loginPayload.email!.includes('@')) {
      user = await this.userService.getUserByEmailOrNull(loginPayload.email);
    } else {
      user = await this.userService.getUserByPhoneNumberOrNull(
        loginPayload.email,
      );
    }

    if (!user) {
      Logger.error(`user with identifier: ${loginPayload.email} not found`);
      return Promise.reject(new UnauthorizedException(`AuthService: login1`));
    }

    // get user password
    const userPassword = await this.passwordService.getUserPasswordbyIdOrNull(
      user.id,
    );

    if (!userPassword) {
      Logger.error(`user password with id: ${user.id} not found`);
      return Promise.reject(new UnauthorizedException(`AuthService: login2`));
    }

    const passwordMatches = HashService.compareHash({
      storedHash: userPassword.hash,
      storedSalt: userPassword.salt,
      tobeHashed: loginPayload.password,
    });

    if (!passwordMatches) {
      Logger.error(`user password with id: ${user.id} not match`);
      return Promise.reject(new UnauthorizedException(`AuthService: login3`));
    }

    // Générer le token avec l'identifiant approprié (email ou téléphone)
    const contactIdentifier = user.email || user.phoneNumber || '';
    const tokens = await this.generateTokens(user.id, contactIdentifier);

    await this.refreshTokenService.createOrUpdateRefreshToken({
      userId: user.id,
      newRt: tokens.refreshToken,
    });

    await this.userService.updateUserStatusToActive(user.id);

    return {
      user,
      tokens,
    };
  }

  // Logout
  public async logout(userId: number): Promise<string> {
    await this.refreshTokenService.deleteRefreshTokenByUserId(userId);

    return `Logged out successfully`;
  }

  // Refresh token
  public async refreshToken({
    id,
    refreshToken,
  }: {
    id: number;
    refreshToken: string;
  }): Promise<IRefreshTokenResponse> {
    const user = await this.userService.getUserByIdOrNull(id);

    if (!user) {
      return Promise.reject(
        new UnauthorizedException(`AuthService: user not found refreshToken1`),
      );
    }

    const userRT =
      await this.refreshTokenService.getRefreshTokenByUserIdOrNull(id);

    if (!userRT) {
      return Promise.reject(
        new ForbiddenException(
          `AuthService: refreshToken not found refreshToken2`,
        ),
      );
    }

    const rtMatches = HashService.compareHash({
      storedHash: userRT.hash,
      storedSalt: userRT.salt,
      tobeHashed: refreshToken,
    });

    if (!rtMatches) {
      return Promise.reject(
        new ForbiddenException(
          `AuthService: refreshToken not match refreshToken 3`,
        ),
      );
    }

    const tokens = await this.generateTokens(
      user.id,
      user.email ? user.email : user.phoneNumber ? user.phoneNumber : '',
    );

    await this.refreshTokenService.createOrUpdateRefreshToken({
      userId: user.id,
      newRt: tokens.refreshToken,
    });

    return {
      user,
      tokens,
    };
  }

  // Generate access & refresh tokens
  private async generateTokens(
    userId: number,
    email: string,
  ): Promise<ITokens> {
    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
        },
        {
          secret: jwtConstants.jwtSecret,
          expiresIn: jwtConstants.accessTokenExpiresIn,
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
        },
        {
          secret: jwtConstants.jwtRefreshSecret,
          expiresIn: jwtConstants.refreshTokenExpiresIn,
        },
      ),
    ]);

    return {
      accessToken: at,
      refreshToken: rt,
      accessTokenExpiresIn: jwtConstants.accessTokenExpiresIn,
    };
  }

  // Send verify email for new user
  public async sendVerifyEmailForNewUser({
    email,
  }: Pick<User, 'email'>): Promise<string> {
    const user = await this.userService.getUserByEmailOrNull(email);

    if (!user) {
      return Promise.reject(
        new ForbiddenException(
          `AuthService: we don't find an associated user with this email: ${email}`,
        ),
      );
    }

    // Send verify email or throw
    return this.sendVerifyEmailOrThrow({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      phoneNumber: user.phoneNumber,
      apiEndPoint: AUTH_PATHS.POST_VERIFY_EMAIL_FOR_NEW_USER,
    });
  }

  // Send verify sms or throw
  public async sendVerifyEmailOrThrow({
    id,
    email,
    apiEndPoint,
    phoneNumber,
  }: Pick<User, 'id' | 'email' | 'firstName' | 'phoneNumber'> & {
    apiEndPoint:
      | AUTH_PATHS.POST_VERIFY_EMAIL_FOR_NEW_USER
      | AUTH_PATHS.POST_VERIFY_NEW_EMAIL;
  }): Promise<string> {
    const verifyEmailToken = await this.generateVerifyEmailToken({
      id,
      email,
    });

    const sendEmailSubPath =
      apiEndPoint === AUTH_PATHS.POST_VERIFY_EMAIL_FOR_NEW_USER
        ? `${apiEndPoint}`
        : null;

    await this.emailService.sendEmailOrThrow({
      to: [email ?? ''],
      subject: 'Verify your email',
      html: verifyEmailEdm(
        `${process.env.FRONTEND_BASE_URL}/auth/${sendEmailSubPath}?token=${verifyEmailToken}&email=${email}`,
      ),
    });

    return `Verify email sent successfully`;
  }

  // Generate verify email token
  private async generateVerifyEmailToken({
    id,
    email,
  }: Pick<User, 'id' | 'email'>): Promise<string> {
    const jwtPayload: VerifyEmailJwtPayload = {
      sub: id,
      email: email!.toLowerCase(),
    };

    return this.jwtService.signAsync(jwtPayload, {
      secret: jwtConstants.verifyEmailSecret,
      expiresIn: jwtConstants.jwtVerifyEmailTokenExpirationTime,
    });
  }

  // Verify email for new user
  public async verifyEmailForNewUser(userId: User['id']): Promise<string> {
    const user = await this.userService.getUserByIdOrNull(userId);

    if (!user) {
      return Promise.reject(
        new ForbiddenException(
          `AuthService: user not found verifyEmailForNewUser1`,
        ),
      );
    }

    if (user.status === UserStatus.ACTIVE) {
      return Promise.reject(
        new ForbiddenException(
          `AuthService: user already verified verifyEmailForNewUser2`,
        ),
      );
    }

    // update user status to active
    await this.userService.updateUserStatusToActive(user.id);

    return `Email verified successfully`;
  }

  // Change email to new email
  public async changeEmailToNewEmail({
    userId,
    newEmail,
  }: {
    userId: User['id'];
    newEmail: User['newEmail'];
  }): Promise<string> {
    const user = await this.userService.getUserByIdOrNull(userId);

    if (!user) {
      return Promise.reject(
        new ForbiddenException(
          'AuthService: changeEmailToNewEmail1: user not found',
        ),
      );
    }

    // if user is not attempting to change his email dont send email
    if (!user.newEmail) {
      return Promise.reject(
        new ForbiddenException('AuthService: changeEmailToNewEmail2'),
      );
    }

    // just incase
    if (user?.newEmail && newEmail !== user.newEmail) {
      return Promise.reject(
        new ForbiddenException('AuthService: changeEmailToNewEmail3'),
      );
    }

    await this.userService.checkIfChangeEmailIsNotAllowedOrThrow({
      id: userId,
      email: newEmail ?? '',
    });

    await this.userService.changeEmail(userId, {
      email: user.newEmail,
      newEmail: null,
      status: UserStatus.ACTIVE,
    });

    return `Changed email successfully`;
  }

  // Send verify new email
  public async sendVerifyNewEmail({
    newEmail,
    userId,
  }: {
    newEmail: User['newEmail'];
    userId: User['id'];
  }): Promise<string> {
    await this.userService.checkIfChangeEmailIsNotAllowedOrThrow({
      id: userId,
      email: newEmail ?? '',
    });

    const user = await this.userService.getUserByIdOrNull(userId);

    if (!user) {
      return Promise.reject(
        new BadRequestException(`AuthService: sendVerifyNewEmail1`),
      );
    }

    // if user is not attempting to change his email dont send email
    if (!user.newEmail) {
      return Promise.reject(
        new BadRequestException(`AuthService: sendVerifyNewEmail2`),
      );
    }

    return this.sendVerifyEmailOrThrow({
      id: userId,
      email: newEmail ?? '',
      firstName: user.firstName,
      phoneNumber: user.phoneNumber,
      apiEndPoint: AUTH_PATHS.POST_VERIFY_NEW_EMAIL,
    });
  }

  // Change email and send verify new email
  public async changeEmailAndSendVerifyNewEmail({
    userId,
    newEmail,
  }: {
    userId: User['id'];
    newEmail: User['newEmail'];
  }): Promise<string> {
    await this.userService.checkIfChangeEmailIsNotAllowedOrThrow({
      id: userId,
      email: newEmail ?? '',
    });

    const user = await this.userService.getUserByIdOrNull(userId);

    if (!user) {
      return Promise.reject(
        new ForbiddenException(
          `AuthService: changeEmailAndSendVerifyNewEmail1`,
        ),
      );
    }

    await this.userService.changeEmail(userId, {
      newEmail,
    });

    return this.sendVerifyEmailOrThrow({
      id: userId,
      email: newEmail ?? '',
      firstName: user.firstName,
      phoneNumber: user.phoneNumber,
      apiEndPoint: AUTH_PATHS.POST_VERIFY_NEW_EMAIL,
    });
  }

  // Change password
  public async changePassword({
    userId,
    plainTextPassword,
  }: {
    userId: User['id'];
    plainTextPassword: string;
  }): Promise<string> {
    await this.passwordService.hashThenCreateOrUpdatePassword({
      userId,
      plainTextPassword,
    });

    return `Password updated successfully`;
  }

  // Méthode générique pour envoyer un OTP par email ou SMS
  public async sendOtpContact({
    contact,
    isEmail,
  }: ISendOtpContactBody): Promise<void> {
    // Déterminer si c'est un email ou un numéro de téléphone
    const isEmailContact =
      isEmail !== undefined ? isEmail : contact.includes('@');

    // Récupérer l'utilisateur par le bon moyen selon le type de contact
    const user = isEmailContact
      ? await this.userService.getUserByEmailOrNull(contact)
      : await this.userService.getUserByPhoneNumberOrNull(contact);

    if (!user) {
      return;
    }

    // Récupérer le contact principal de l'utilisateur
    const userContact = isEmailContact
      ? contact
      : user.phoneNumber || user.email!;

    const otpSecret = await this.otpAndSecretService.getOTPAndSecretByContact({
      contact: userContact,
    });

    const maxRequestCount: number = 3;
    const currentTimeStamp = new Date().getTime();
    let shouldIncremnetRequestSecretCounter = false;
    let shouldResetRequestSecretCounterToFirstTry = false;
    let shouldResetOtpCodeRetryCounter = false;

    if (otpSecret) {
      if (
        currentTimeStamp - otpSecret.updated.getTime() <
        24 * 60 * 60 * 1000
      ) {
        if (otpSecret.otpSecretRequestCount >= maxRequestCount) {
          return Promise.reject(
            new ForbiddenException('AuthService: sendOTPContact1'),
          );
        } else {
          shouldIncremnetRequestSecretCounter = true;
          shouldResetOtpCodeRetryCounter = true;
        }
      } else {
        // reset both after some period (1 day) has passed
        shouldResetRequestSecretCounterToFirstTry = true;
        shouldResetOtpCodeRetryCounter = true;
      }
    }

    // Options différentes selon la méthode d'envoi
    if (isEmailContact) {
      // Pour l'email, utiliser un code à 4 chiffres
      authenticator.options = {
        digits: 4, // use The options setter; we need otp code to be 4 digits
        step: 1800, // half an hour
        window: 1,
      };
    } else {
      // Pour le SMS, utiliser un code à 6 chiffres
      authenticator.options = {
        digits: 6,
        step: 600, // 10 minutes
        window: 1,
      };
    }

    let oTPSecret: string, otpCode: string, otpCodeInteger: number;

    do {
      // Generate OTP secret
      oTPSecret = authenticator.generateSecret();

      // Generate OTP code
      otpCode = authenticator.generate(oTPSecret);

      // Parse OTP code to integer
      otpCodeInteger = parseInt(otpCode);
    } while (otpCode[0] === '0'); // retry if otp code starts with 0

    // make sure otp code is integer just in case
    if (isNaN(otpCodeInteger)) {
      return Promise.reject(
        new ForbiddenException('AuthService: sendOTPContact2'),
      );
    }

    // save otp secret to database
    await this.otpAndSecretService.createOrUpdateOtpAndSecretOrThrow(
      {
        contact: userContact,
        secret: oTPSecret,
      },
      {
        shouldIncremnetRequestSecretCounter,
        shouldResetRequestSecretCounter: false,
        shouldResetRequestSecretCounterToFirstTry,
        shouldIncremnetOtpCodeRetryCounter: false,
        shouldResetOtpCodeRetryCounter,
      },
    );

    // Envoyer l'OTP via email ou SMS selon le type de contact
    if (isEmailContact) {
      return this.emailService.sendEmailOrThrow({
        to: [contact],
        subject: `Reset Your Password, ${user.firstName}`,
        html: resetPasswordEdm(otpCodeInteger),
      });
    } else {
      return this.smsService.sendVerificationCode(contact, otpCode);
    }
  }

  // Send otp email - maintenu pour la compatibilité
  public async sendOtpEmail({ email }: ISendOtpEmailBody): Promise<void> {
    return this.sendOtpContact({ contact: email, isEmail: true });
  }

  // Verify otp or throw
  public async verifyOtpOrThrow(
    {
      otpCode,
      contact,
    }: {
      otpCode: number;
      contact: string;
    },
    isResetingPassword = false,
  ): Promise<boolean> {
    // Déterminer si c'est un email ou un numéro de téléphone
    const isEmailContact = contact.includes('@');

    // Récupérer l'utilisateur par le bon moyen selon le type de contact
    const user = isEmailContact
      ? await this.userService.getUserByEmailOrNull(contact)
      : await this.userService.getUserByPhoneNumberOrNull(contact);

    if (!user) {
      return Promise.reject(
        new ForbiddenException('AuthService: verifyOtpOrThrow1'),
      );
    }

    const otpSecret = await this.otpAndSecretService.getOTPAndSecretByContact({
      contact,
    });

    if (!otpSecret) {
      return Promise.reject(
        new NotFoundException(
          'AuthService: verifyOtpOrThrow2: secret was not found',
        ),
      );
    }

    const maxRequestCount: number = 3;
    let shouldIncremnetOtpCodeRetryCounter = false;

    if (
      (isResetingPassword && otpSecret.otpCodeRetryCount > maxRequestCount) ||
      (!isResetingPassword && otpSecret.otpCodeRetryCount >= maxRequestCount)
    ) {
      return Promise.reject(
        new ForbiddenException(
          'AuthService: verifyOtpOrThrow3: verifyOTP: 429 Too Many Requests',
        ),
      );
    }

    // note: use authenticator.check to check validation without expiry
    const isValid = authenticator.verify({
      token: otpCode.toString(),
      secret: otpSecret.secret,
    });

    if (!isValid) {
      shouldIncremnetOtpCodeRetryCounter = true;
      // save otp secret to database
      await this.otpAndSecretService.createOrUpdateOtpAndSecretOrThrow(
        {
          contact,
          secret: otpSecret.secret,
        },
        {
          shouldIncremnetRequestSecretCounter: false,
          shouldResetRequestSecretCounter: false,
          shouldResetRequestSecretCounterToFirstTry: false,
          shouldIncremnetOtpCodeRetryCounter,
          shouldResetOtpCodeRetryCounter: false,
        },
      );
      return Promise.reject(
        new ForbiddenException(
          'AuthService: verifyOtpOrThrow4: otpCode is not valid',
        ),
      );
    } else {
      // !even if otp secret is valid we should increment the retry , so that user don't use the same secret to change the password for indifinitly for the rest of otp life time
      shouldIncremnetOtpCodeRetryCounter = true;
      await this.otpAndSecretService.createOrUpdateOtpAndSecretOrThrow(
        {
          contact,
          secret: otpSecret.secret,
        },
        {
          shouldIncremnetRequestSecretCounter: false,
          shouldResetRequestSecretCounter: false,
          shouldResetRequestSecretCounterToFirstTry: false,
          shouldIncremnetOtpCodeRetryCounter,
          shouldResetOtpCodeRetryCounter: false,
        },
      );
      return isValid;
    }
  }

  // Reset password
  public async resetPassword({
    otpCode,
    email,
    newPassword,
  }: IResetPasswordBody): Promise<void> {
    const user = await this.userService.getUserByEmailOrNull(email);

    if (!user) {
      return Promise.reject(
        new ForbiddenException('AuthService: resetPassword1'),
      );
    }

    await this.passwordService.checkIfPasswordIsNewOrThrow({
      userId: user.id,
      plainTextPassword: newPassword,
    });

    // Utiliser le contact approprié pour la vérification
    const contact = user.phoneNumber || user.email!;
    await this.verifyOtpOrThrow(
      {
        otpCode,
        contact,
      },
      true,
    );

    await this.passwordService.hashThenCreateOrUpdatePassword({
      userId: user.id,
      plainTextPassword: newPassword,
    });
  }
  // Méthode pour envoyer un OTP par SMS
  private async sendVerifySmsForNewUser({
    phoneNumber,
  }: {
    phoneNumber: string;
  }): Promise<string> {
    // Utiliser la méthode générique pour envoyer un OTP
    await this.sendOtpContact({
      contact: phoneNumber,
      isEmail: false,
    });

    return `Verification SMS sent successfully to ${phoneNumber}`;
  }

  private generateOTP(): string {
    const otpCode = Math.floor(100000 + Math.random() * 900000);
    return otpCode.toString().padStart(6, '0');
  }
}
