-- CreateEnum
CREATE TYPE "public"."ReviewStatus" AS ENUM ('PENDING', 'PUBLISHED', 'REJECTED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "public"."ResponseType" AS ENUM ('CLIENT', 'OWNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."ResponseStatus" AS ENUM ('PENDING', 'PUBLISHED', 'REJECTED', 'HIDDEN');

-- CreateTable
CREATE TABLE "public"."Review" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "residenceId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "cleanlinessRating" INTEGER,
    "locationRating" INTEGER,
    "valueForMoneyRating" INTEGER,
    "serviceRating" INTEGER,
    "status" "public"."ReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
    "moderatorId" INTEGER,
    "moderationNote" TEXT,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReviewResponse" (
    "id" SERIAL NOT NULL,
    "reviewId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "responseType" "public"."ResponseType" NOT NULL DEFAULT 'CLIENT',
    "status" "public"."ResponseStatus" NOT NULL DEFAULT 'PUBLISHED',
    "moderatorId" INTEGER,
    "moderationNote" TEXT,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Review_residenceId_idx" ON "public"."Review"("residenceId");

-- CreateIndex
CREATE INDEX "Review_rating_idx" ON "public"."Review"("rating");

-- CreateIndex
CREATE INDEX "Review_status_idx" ON "public"."Review"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Review_userId_residenceId_key" ON "public"."Review"("userId", "residenceId");

-- CreateIndex
CREATE INDEX "ReviewResponse_reviewId_idx" ON "public"."ReviewResponse"("reviewId");

-- CreateIndex
CREATE INDEX "ReviewResponse_userId_idx" ON "public"."ReviewResponse"("userId");

-- CreateIndex
CREATE INDEX "ReviewResponse_responseType_idx" ON "public"."ReviewResponse"("responseType");

-- CreateIndex
CREATE INDEX "ReviewResponse_created_idx" ON "public"."ReviewResponse"("created");

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_residenceId_fkey" FOREIGN KEY ("residenceId") REFERENCES "public"."Residence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "public"."Administrator"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReviewResponse" ADD CONSTRAINT "ReviewResponse_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "public"."Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReviewResponse" ADD CONSTRAINT "ReviewResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReviewResponse" ADD CONSTRAINT "ReviewResponse_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "public"."Administrator"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
