-- AlterEnum
ALTER TYPE "FinancialEntryPurpose" ADD VALUE 'TOLL';

-- AlterTable
ALTER TABLE "financial_entries" ADD COLUMN     "fastTagTransactionId" TEXT,
ADD COLUMN     "fuelEntryId" TEXT,
ADD COLUMN     "fuelStationId" TEXT,
ADD COLUMN     "odometerReading" INTEGER,
ADD COLUMN     "quantityLiters" DECIMAL(10,2),
ADD COLUMN     "ratePerLiter" DECIMAL(10,2),
ADD COLUMN     "settlementPlan" JSONB,
ADD COLUMN     "tripId" TEXT,
ADD COLUMN     "vehicleId" TEXT;

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_fuelStationId_fkey" FOREIGN KEY ("fuelStationId") REFERENCES "fuel_stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_fuelEntryId_fkey" FOREIGN KEY ("fuelEntryId") REFERENCES "fuel_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_fastTagTransactionId_fkey" FOREIGN KEY ("fastTagTransactionId") REFERENCES "fasttag_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

