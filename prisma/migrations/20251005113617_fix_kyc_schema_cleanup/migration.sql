-- CreateTable
CREATE TABLE "public"."Kyc" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "adminId" INTEGER,
    "status" "public"."IdentityStatus" NOT NULL DEFAULT 'PENDING',
    "documentType" TEXT NOT NULL,
    "documentUrl" TEXT NOT NULL,
    "selfieUrl" TEXT,
    "rejectionReason" TEXT,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validatedAt" TIMESTAMP(3),

    CONSTRAINT "Kyc_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Kyc" ADD CONSTRAINT "Kyc_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Kyc" ADD CONSTRAINT "Kyc_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."Administrator"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
