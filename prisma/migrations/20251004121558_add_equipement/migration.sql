/*
  Warnings:

  - Added the required column `desc` to the `Rule` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Equipment" ADD COLUMN     "icon" VARCHAR(255);

-- AlterTable
ALTER TABLE "public"."Rule" ADD COLUMN     "desc" VARCHAR(512) NOT NULL;
