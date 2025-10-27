-- CreateTable
CREATE TABLE "public"."residence_rooms" (
    "id" SERIAL NOT NULL,
    "count" INTEGER NOT NULL,
    "residenceId" INTEGER NOT NULL,
    "roomId" INTEGER NOT NULL,

    CONSTRAINT "residence_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."favorites" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "residenceId" INTEGER NOT NULL,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rooms" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "icon" VARCHAR(255),

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."residence_rooms" ADD CONSTRAINT "residence_rooms_residenceId_fkey" FOREIGN KEY ("residenceId") REFERENCES "public"."Residence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."residence_rooms" ADD CONSTRAINT "residence_rooms_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."favorites" ADD CONSTRAINT "favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."favorites" ADD CONSTRAINT "favorites_residenceId_fkey" FOREIGN KEY ("residenceId") REFERENCES "public"."Residence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
