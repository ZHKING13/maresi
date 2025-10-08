/*
  Warnings:

  - You are about to drop the column `photos` on the `Residence` table. All the data in the column will be lost.
  - You are about to drop the column `rules` on the `Residence` table. All the data in the column will be lost.
  - You are about to drop the column `specialConditions` on the `Residence` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Residence" DROP COLUMN "photos",
DROP COLUMN "rules",
DROP COLUMN "specialConditions";

-- CreateTable
CREATE TABLE "public"."Rule" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SpecialCondition" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "SpecialCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Media" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ResidenceRule" (
    "residenceId" INTEGER NOT NULL,
    "ruleId" INTEGER NOT NULL,

    CONSTRAINT "ResidenceRule_pkey" PRIMARY KEY ("residenceId","ruleId")
);

-- CreateTable
CREATE TABLE "public"."ResidenceSpecialCondition" (
    "residenceId" INTEGER NOT NULL,
    "specialConditionId" INTEGER NOT NULL,

    CONSTRAINT "ResidenceSpecialCondition_pkey" PRIMARY KEY ("residenceId","specialConditionId")
);

-- CreateTable
CREATE TABLE "public"."ResidenceMedia" (
    "residenceId" INTEGER NOT NULL,
    "mediaId" INTEGER NOT NULL,

    CONSTRAINT "ResidenceMedia_pkey" PRIMARY KEY ("residenceId","mediaId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rule_name_key" ON "public"."Rule"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialCondition_name_key" ON "public"."SpecialCondition"("name");

-- AddForeignKey
ALTER TABLE "public"."ResidenceRule" ADD CONSTRAINT "ResidenceRule_residenceId_fkey" FOREIGN KEY ("residenceId") REFERENCES "public"."Residence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ResidenceRule" ADD CONSTRAINT "ResidenceRule_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "public"."Rule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ResidenceSpecialCondition" ADD CONSTRAINT "ResidenceSpecialCondition_residenceId_fkey" FOREIGN KEY ("residenceId") REFERENCES "public"."Residence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ResidenceSpecialCondition" ADD CONSTRAINT "ResidenceSpecialCondition_specialConditionId_fkey" FOREIGN KEY ("specialConditionId") REFERENCES "public"."SpecialCondition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ResidenceMedia" ADD CONSTRAINT "ResidenceMedia_residenceId_fkey" FOREIGN KEY ("residenceId") REFERENCES "public"."Residence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ResidenceMedia" ADD CONSTRAINT "ResidenceMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "public"."Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
