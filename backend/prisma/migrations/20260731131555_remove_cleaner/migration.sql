-- DropForeignKey
ALTER TABLE "trips" DROP CONSTRAINT "trips_cleanerId_fkey";

-- DropForeignKey
ALTER TABLE "vehicle_assignments" DROP CONSTRAINT "vehicle_assignments_cleanerId_fkey";

-- DropIndex
DROP INDEX "vehicle_assignments_cleanerId_idx";

-- AlterTable
ALTER TABLE "trips" DROP COLUMN "cleanerId";

-- AlterTable
ALTER TABLE "vehicle_assignments" DROP COLUMN "cleanerId";

-- DropTable
DROP TABLE "cleaners";
