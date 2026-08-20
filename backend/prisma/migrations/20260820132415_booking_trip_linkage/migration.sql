-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "fromLocationId" TEXT,
ADD COLUMN     "intentId" TEXT,
ADD COLUMN     "toLocationId" TEXT,
ADD COLUMN     "tripId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "bookings_intentId_key" ON "bookings"("intentId");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_tripId_key" ON "bookings"("tripId");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "intents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

