/*
  Warnings:

  - Added the required column `residenceTypeId` to the `Residence` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Residence" ADD COLUMN     "residenceTypeId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "public"."residence_types" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "icon" VARCHAR(255),

    CONSTRAINT "residence_types_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Residence" ADD CONSTRAINT "Residence_residenceTypeId_fkey" FOREIGN KEY ("residenceTypeId") REFERENCES "public"."residence_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
