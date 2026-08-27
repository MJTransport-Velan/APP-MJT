-- Booking no longer links to Operations (Trip/Intent). Bookings and Trips are
-- now separate modules: a booking keeps its own vehicle/driver snapshot and LR
-- flow, with no auto-created Trip or Intent behind it.

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "bookings_tripId_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "bookings_intentId_fkey";

-- DropIndex
-- The index this originally dropped only ever existed on a drifted dev
-- database; on a clean history the unique index goes with the column below.
DROP INDEX IF EXISTS "bookings_tripId_idx";

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN IF EXISTS "tripId",
DROP COLUMN IF EXISTS "intentId";
