-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('EMAIL', 'SMS', 'FCM', 'PUSH_IN_APP');

-- CreateEnum
CREATE TYPE "public"."NotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'READ');

-- CreateEnum
CREATE TYPE "public"."NotificationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "public"."NotificationLog" (
    "id" UUID NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "status" "public"."NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "public"."NotificationPriority" NOT NULL DEFAULT 'MEDIUM',
    "recipientUserId" INTEGER,
    "recipientEmail" TEXT,
    "recipientPhone" TEXT,
    "recipientName" TEXT,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "templateId" TEXT,
    "variables" JSONB,
    "messageId" TEXT,
    "providerResponse" JSONB,
    "errorMessage" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "created" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NotificationSettings" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "isEditable" BOOLEAN NOT NULL DEFAULT true,
    "created" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "NotificationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationLog_type_status_idx" ON "public"."NotificationLog"("type", "status");

-- CreateIndex
CREATE INDEX "NotificationLog_recipientUserId_idx" ON "public"."NotificationLog"("recipientUserId");

-- CreateIndex
CREATE INDEX "NotificationLog_created_idx" ON "public"."NotificationLog"("created");

-- CreateIndex
CREATE INDEX "NotificationLog_expiresAt_idx" ON "public"."NotificationLog"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSettings_key_key" ON "public"."NotificationSettings"("key");

-- AddForeignKey
ALTER TABLE "public"."NotificationLog" ADD CONSTRAINT "NotificationLog_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
