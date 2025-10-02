/*
  Warnings:

  - You are about to drop the column `email` on the `OTPAndSecret` table. All the data in the column will be lost.
  - You are about to drop the column `bio` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[phoneNumber]` on the table `OTPAndSecret` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phoneNumber]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `phoneNumber` to the `OTPAndSecret` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phoneNumber` to the `User` table without a default value. This is not possible if the table is not empty.
  - Made the column `dateOfBirth` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."Post" DROP CONSTRAINT "Post_userId_fkey";

-- DropIndex
DROP INDEX "public"."OTPAndSecret_email_key";

-- AlterTable
ALTER TABLE "public"."OTPAndSecret" DROP COLUMN "email",
ADD COLUMN     "phoneNumber" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "bio",
DROP COLUMN "type",
ADD COLUMN     "phoneNumber" TEXT NOT NULL,
ALTER COLUMN "dateOfBirth" SET NOT NULL;

-- DropEnum
DROP TYPE "public"."UserType";

-- CreateIndex
CREATE UNIQUE INDEX "OTPAndSecret_phoneNumber_key" ON "public"."OTPAndSecret"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "public"."User"("phoneNumber");
