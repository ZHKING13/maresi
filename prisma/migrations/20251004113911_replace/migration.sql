/*
  Warnings:

  - You are about to drop the column `location` on the `Residence` table. All the data in the column will be lost.
  - Added the required column `lat` to the `Residence` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lng` to the `Residence` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Residence" DROP COLUMN "location",
ADD COLUMN     "lat" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "lng" DOUBLE PRECISION NOT NULL;
