-- Booking no longer links to Operations (Trip/Intent). Bookings and Trips are
-- now separate modules: a booking keeps its own vehicle/driver snapshot and LR
-- flow, with no auto-created Trip or Intent behind it.

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_tripId_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_intentId_fkey";

-- DropIndex
DROP INDEX "bookings_tripId_idx";

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "tripId",
DROP COLUMN "intentId";
