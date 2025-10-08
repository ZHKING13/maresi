import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IdentityStatus, KycFor } from '@prisma/client';

export type KycGuardType = 'USER' | 'HOST';

@Injectable()
export class KycGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new ForbiddenException('Utilisateur non authentifié');

    // Par défaut, on vérifie pour USER (réservation)
    // Pour host, passer le type dans le décorateur ou le guard
    const requiredType: KycGuardType = request.kycType || 'USER';

    const kyc = await this.prisma.kyc.findFirst({
      where: {
        userId: user.id,
        kycFor: requiredType,
        status: 'VALIDATED',
      },
    });
    if (!kyc) {
      throw new ForbiddenException(
        requiredType === 'HOST'
          ? 'KYC host non validé : accès refusé.'
          : 'KYC utilisateur non validé : accès refusé.',
      );
    }
    return true;
  }
}
