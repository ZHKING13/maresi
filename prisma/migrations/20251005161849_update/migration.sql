/*
  Warnings:

  - You are about to drop the column `identityDocumentType` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `identityDocumentUrl` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `identityStatus` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `selfieUrl` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "identityDocumentType",
DROP COLUMN "identityDocumentUrl",
DROP COLUMN "identityStatus",
DROP COLUMN "selfieUrl";
