-- CreateEnum
CREATE TYPE "public"."KycFor" AS ENUM ('USER', 'HOST');

-- AlterTable
ALTER TABLE "public"."Kyc" ADD COLUMN     "kycFor" "public"."KycFor" NOT NULL DEFAULT 'USER';
