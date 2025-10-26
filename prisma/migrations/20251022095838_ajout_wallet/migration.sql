-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('MOBILE_MONEY', 'CREDIT_CARD');

-- CreateEnum
CREATE TYPE "public"."PaymentProvider" AS ENUM ('ORANGE_MONEY', 'MTN_MONEY', 'MOOV_MONEY', 'VISA', 'MASTERCARD');

-- CreateEnum
CREATE TYPE "public"."PaymentCurrency" AS ENUM ('XOF', 'XAF', 'USD', 'EUR');

-- CreateEnum
CREATE TYPE "public"."WalletTransactionType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "public"."WalletTransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REVERSED');

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" SERIAL NOT NULL,
    "transactionId" TEXT NOT NULL,
    "cinetPayTransactionId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" "public"."PaymentCurrency" NOT NULL DEFAULT 'XOF',
    "description" TEXT,
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "public"."PaymentMethod" NOT NULL,
    "provider" "public"."PaymentProvider",
    "userId" INTEGER,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "notifyUrl" TEXT,
    "returnUrl" TEXT,
    "channels" TEXT,
    "cinetPayData" JSONB,
    "paymentUrl" TEXT,
    "metadata" JSONB,
    "failureReason" TEXT,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "created" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PaymentWebhook" (
    "id" SERIAL NOT NULL,
    "paymentId" INTEGER,
    "cinetPayTransactionId" TEXT,
    "eventType" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "signature" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "created" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "PaymentWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Wallet" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency" "public"."PaymentCurrency" NOT NULL DEFAULT 'XOF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockReason" TEXT,
    "dailyLimit" DECIMAL(15,2),
    "monthlyLimit" DECIMAL(15,2),
    "maxBalance" DECIMAL(15,2),
    "metadata" JSONB,
    "created" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(6) NOT NULL,
    "lastTransactionAt" TIMESTAMP(6),

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WalletTransaction" (
    "id" SERIAL NOT NULL,
    "transactionId" TEXT NOT NULL,
    "referenceId" TEXT,
    "walletId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "public"."WalletTransactionType" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" "public"."PaymentCurrency" NOT NULL DEFAULT 'XOF',
    "balanceBefore" DECIMAL(15,2) NOT NULL,
    "balanceAfter" DECIMAL(15,2) NOT NULL,
    "status" "public"."WalletTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "category" TEXT,
    "metadata" JSONB,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "processedBy" INTEGER,
    "processedAt" TIMESTAMP(6),
    "failureReason" TEXT,
    "created" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_transactionId_key" ON "public"."Payment"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_cinetPayTransactionId_key" ON "public"."Payment"("cinetPayTransactionId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "public"."Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "public"."Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_transactionId_idx" ON "public"."Payment"("transactionId");

-- CreateIndex
CREATE INDEX "Payment_cinetPayTransactionId_idx" ON "public"."Payment"("cinetPayTransactionId");

-- CreateIndex
CREATE INDEX "Payment_created_idx" ON "public"."Payment"("created");

-- CreateIndex
CREATE INDEX "PaymentWebhook_processed_idx" ON "public"."PaymentWebhook"("processed");

-- CreateIndex
CREATE INDEX "PaymentWebhook_cinetPayTransactionId_idx" ON "public"."PaymentWebhook"("cinetPayTransactionId");

-- CreateIndex
CREATE INDEX "PaymentWebhook_receivedAt_idx" ON "public"."PaymentWebhook"("receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "public"."Wallet"("userId");

-- CreateIndex
CREATE INDEX "Wallet_userId_idx" ON "public"."Wallet"("userId");

-- CreateIndex
CREATE INDEX "Wallet_isActive_isBlocked_idx" ON "public"."Wallet"("isActive", "isBlocked");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTransaction_transactionId_key" ON "public"."WalletTransaction"("transactionId");

-- CreateIndex
CREATE INDEX "WalletTransaction_walletId_idx" ON "public"."WalletTransaction"("walletId");

-- CreateIndex
CREATE INDEX "WalletTransaction_userId_idx" ON "public"."WalletTransaction"("userId");

-- CreateIndex
CREATE INDEX "WalletTransaction_transactionId_idx" ON "public"."WalletTransaction"("transactionId");

-- CreateIndex
CREATE INDEX "WalletTransaction_type_status_idx" ON "public"."WalletTransaction"("type", "status");

-- CreateIndex
CREATE INDEX "WalletTransaction_created_idx" ON "public"."WalletTransaction"("created");

-- CreateIndex
CREATE INDEX "WalletTransaction_referenceId_idx" ON "public"."WalletTransaction"("referenceId");

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentWebhook" ADD CONSTRAINT "PaymentWebhook_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "public"."Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "public"."Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WalletTransaction" ADD CONSTRAINT "WalletTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
