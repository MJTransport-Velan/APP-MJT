-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('WEBSITE', 'COUNTER');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "freightAmount" DECIMAL(12,2),
ADD COLUMN     "source" "BookingSource" NOT NULL DEFAULT 'WEBSITE';

