/*
  Warnings:

  - You are about to drop the column `image` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."IdentityStatus" AS ENUM ('PENDING', 'VALIDATED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."KYC_STATUS" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "image",
ADD COLUMN     "avatar" TEXT DEFAULT 'https://ui.shadcn.com/avatars/shadcn.jpg',
ADD COLUMN     "identityDocumentType" TEXT,
ADD COLUMN     "identityDocumentUrl" TEXT,
ADD COLUMN     "identityStatus" "public"."IdentityStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "selfieUrl" TEXT,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "dateOfBirth" DROP NOT NULL,
ALTER COLUMN "phoneNumber" DROP NOT NULL;
