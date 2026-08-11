-- CreateEnum
CREATE TYPE "LoadMode" AS ENUM ('FULL', 'PART');

-- AlterEnum
ALTER TYPE "IntentStatus" ADD VALUE 'CONVERTED';

-- AlterTable
ALTER TABLE "intents" ADD COLUMN     "baseFreightAmount" DECIMAL(12,2),
ADD COLUMN     "insuranceRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "loadMode" "LoadMode" NOT NULL DEFAULT 'FULL',
ADD COLUMN     "loadingCharges" DECIMAL(12,2),
ADD COLUMN     "otherCharges" DECIMAL(12,2),
ADD COLUMN     "packages" INTEGER,
ADD COLUMN     "poNumber" TEXT,
ADD COLUMN     "podRequired" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "tollCharges" DECIMAL(12,2),
ADD COLUMN     "volumeCbm" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "trip_notes" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trip_notes_tripId_idx" ON "trip_notes"("tripId");

-- AddForeignKey
ALTER TABLE "trip_notes" ADD CONSTRAINT "trip_notes_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
