-- CreateTable
CREATE TABLE "public"."Equipment" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ResidenceEquipment" (
    "residenceId" INTEGER NOT NULL,
    "equipmentId" INTEGER NOT NULL,

    CONSTRAINT "ResidenceEquipment_pkey" PRIMARY KEY ("residenceId","equipmentId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_name_key" ON "public"."Equipment"("name");

-- AddForeignKey
ALTER TABLE "public"."ResidenceEquipment" ADD CONSTRAINT "ResidenceEquipment_residenceId_fkey" FOREIGN KEY ("residenceId") REFERENCES "public"."Residence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ResidenceEquipment" ADD CONSTRAINT "ResidenceEquipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "public"."Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
