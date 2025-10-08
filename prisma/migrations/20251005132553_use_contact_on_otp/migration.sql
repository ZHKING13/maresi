/*
  Warnings:

  - You are about to drop the column `phoneNumber` on the `OTPAndSecret` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[contact]` on the table `OTPAndSecret` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `contact` to the `OTPAndSecret` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."OTPAndSecret_phoneNumber_key";

-- AlterTable
ALTER TABLE "public"."OTPAndSecret" DROP COLUMN "phoneNumber",
ADD COLUMN     "contact" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "OTPAndSecret_contact_key" ON "public"."OTPAndSecret"("contact");
