-- CreateEnum
CREATE TYPE "FuelBillingMethod" AS ENUM ('FUEL_CARD', 'OTP', 'DIRECT_PAYMENT');

-- DropForeignKey
ALTER TABLE "fuel_entries" DROP CONSTRAINT "fuel_entries_fuelStationId_fkey";

-- AlterTable
ALTER TABLE "fuel_entries" ADD COLUMN     "billingMethod" "FuelBillingMethod",
ALTER COLUMN "fuelStationId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_fuelStationId_fkey" FOREIGN KEY ("fuelStationId") REFERENCES "fuel_stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

