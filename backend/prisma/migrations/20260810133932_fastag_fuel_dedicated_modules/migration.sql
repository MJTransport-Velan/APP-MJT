-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('DIESEL', 'PETROL', 'CNG', 'OTHER');

-- CreateEnum
CREATE TYPE "FastTagTransactionStatus" AS ENUM ('IMPORTED', 'PENDING', 'VERIFIED', 'ALLOCATED', 'RECONCILED', 'CANCELLED', 'ADJUSTED');

-- CreateEnum
CREATE TYPE "FastTagPaymentSource" AS ENUM ('FASTAG_WALLET', 'BANK', 'OTHER');

-- CreateEnum
CREATE TYPE "FastTagMatchStatus" AS ENUM ('MATCHED', 'UNMATCHED', 'DUPLICATE', 'MISSING', 'AMOUNT_MISMATCH', 'PENDING_VERIFICATION');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FastTagTransactionType" ADD VALUE 'REFUND';
ALTER TYPE "FastTagTransactionType" ADD VALUE 'ADJUSTMENT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ImportEntityType" ADD VALUE 'FUEL_ENTRY';
ALTER TYPE "ImportEntityType" ADD VALUE 'FASTTAG_TRANSACTION';

-- AlterTable
ALTER TABLE "fasttag_transactions" ADD COLUMN     "attachment" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "paymentSource" "FastTagPaymentSource" NOT NULL DEFAULT 'FASTAG_WALLET',
ADD COLUMN     "remarks" TEXT,
ADD COLUMN     "status" "FastTagTransactionStatus" NOT NULL DEFAULT 'VERIFIED',
ADD COLUMN     "tollPlaza" TEXT,
ADD COLUMN     "transactionReference" TEXT;

-- AlterTable
ALTER TABLE "fuel_entries" ADD COLUMN     "advanceId" TEXT,
ADD COLUMN     "anomalyReasons" TEXT,
ADD COLUMN     "driverId" TEXT,
ADD COLUMN     "fuelType" "FuelType" NOT NULL DEFAULT 'DIESEL',
ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "isAnomaly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "paymentModeId" TEXT,
ADD COLUMN     "referenceNumber" TEXT,
ADD COLUMN     "remarks" TEXT,
ADD COLUMN     "supplierId" TEXT,
ADD COLUMN     "tripId" TEXT;

-- CreateTable
CREATE TABLE "fasttag_provider_transactions" (
    "id" TEXT NOT NULL,
    "importBatchId" TEXT,
    "fastagNumber" TEXT,
    "vehicleRegistrationNumber" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "tollPlaza" TEXT,
    "location" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "transactionReference" TEXT,
    "matchStatus" "FastTagMatchStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "matchedTransactionId" TEXT,
    "vehicleId" TEXT,
    "tripId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fasttag_provider_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fasttag_provider_transactions_matchedTransactionId_key" ON "fasttag_provider_transactions"("matchedTransactionId");

-- CreateIndex
CREATE INDEX "fasttag_provider_transactions_importBatchId_idx" ON "fasttag_provider_transactions"("importBatchId");

-- CreateIndex
CREATE INDEX "fasttag_provider_transactions_matchStatus_idx" ON "fasttag_provider_transactions"("matchStatus");

-- CreateIndex
CREATE INDEX "fasttag_transactions_status_idx" ON "fasttag_transactions"("status");

-- CreateIndex
CREATE INDEX "fuel_entries_tripId_idx" ON "fuel_entries"("tripId");

-- CreateIndex
CREATE INDEX "fuel_entries_driverId_idx" ON "fuel_entries"("driverId");

-- AddForeignKey
ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_paymentModeId_fkey" FOREIGN KEY ("paymentModeId") REFERENCES "payment_modes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_advanceId_fkey" FOREIGN KEY ("advanceId") REFERENCES "driver_advances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fasttag_provider_transactions" ADD CONSTRAINT "fasttag_provider_transactions_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fasttag_provider_transactions" ADD CONSTRAINT "fasttag_provider_transactions_matchedTransactionId_fkey" FOREIGN KEY ("matchedTransactionId") REFERENCES "fasttag_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fasttag_provider_transactions" ADD CONSTRAINT "fasttag_provider_transactions_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fasttag_provider_transactions" ADD CONSTRAINT "fasttag_provider_transactions_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

