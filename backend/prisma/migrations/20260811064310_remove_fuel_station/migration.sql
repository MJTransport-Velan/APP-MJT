-- DropForeignKey
ALTER TABLE "financial_entries" DROP CONSTRAINT "financial_entries_fuelStationId_fkey";

-- DropForeignKey
ALTER TABLE "fuel_entries" DROP CONSTRAINT "fuel_entries_fuelStationId_fkey";

-- DropIndex
DROP INDEX "fuel_entries_fuelStationId_idx";

-- AlterTable
ALTER TABLE "financial_entries" DROP COLUMN "fuelStationId";

-- AlterTable
ALTER TABLE "fuel_entries" DROP COLUMN "fuelStationId";

-- DropTable
DROP TABLE "fuel_stations";

