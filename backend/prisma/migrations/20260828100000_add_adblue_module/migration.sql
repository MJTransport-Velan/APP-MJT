-- AdBlue / DEF as its own module, alongside Diesel and FASTag.
--
-- Two ways AdBlue reaches a truck, and the fleet needs both:
--   FROM_STOCK      — drums bought in bulk and kept at the yard, then
--                     poured into whichever truck needs topping up.
--   DIRECT_PURCHASE — bought at a pump on the road, straight into the tank.
--
-- The first moves inventory (adblue_stocks / adblue_stock_transactions);
-- the second does not. Both mirror into vehicle_expenses under the new
-- ADBLUE category, so the cost lands on the truck either way and once.

ALTER TYPE "VehicleExpenseCategory" ADD VALUE 'ADBLUE';

CREATE TYPE "AdBlueSource" AS ENUM ('FROM_STOCK', 'DIRECT_PURCHASE');
CREATE TYPE "AdBlueStockTransactionType" AS ENUM ('PURCHASE', 'ISSUE', 'RETURN', 'ADJUSTMENT');

-- One shared store for the whole fleet. Two caches, not one: litres on hand
-- AND what those litres cost, so an issue can be valued at the running
-- weighted average (currentValue / currentQuantityLiters).
CREATE TABLE "adblue_stocks" (
    "id" TEXT NOT NULL,
    "currentQuantityLiters" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currentValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adblue_stocks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "adblue_entries" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "source" "AdBlueSource" NOT NULL DEFAULT 'FROM_STOCK',
    "tripId" TEXT,
    "driverId" TEXT,
    "supplierId" TEXT,
    "paymentModeId" TEXT,
    "location" TEXT,
    "quantityLiters" DECIMAL(10,2),
    "ratePerLiter" DECIMAL(10,2),
    "totalAmount" DECIMAL(12,2),
    "odometerReading" INTEGER,
    "invoiceNumber" TEXT,
    "referenceNumber" TEXT,
    "remarks" TEXT,
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "billDocument" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adblue_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "adblue_stock_transactions" (
    "id" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "type" "AdBlueStockTransactionType" NOT NULL,
    -- Signed for ADJUSTMENT rows, positive for every other type.
    "quantityLiters" DECIMAL(10,2) NOT NULL,
    "ratePerLiter" DECIMAL(10,2),
    "amount" DECIMAL(12,2) NOT NULL,
    "vehicleId" TEXT,
    "supplierId" TEXT,
    -- Set on the ISSUE row a FROM_STOCK top-up owns, so editing or deleting
    -- that top-up can find its withdrawal and keep the stock in step.
    "adBlueEntryId" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoiceNumber" TEXT,
    "referenceNumber" TEXT,
    "remarks" TEXT,
    "billDocument" TEXT,
    -- Which Bank/Cash account a PURCHASE debited, so edit/delete can reverse it.
    "fundAccountType" TEXT,
    "fundAccountId" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adblue_stock_transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "adblue_entries_vehicleId_idx" ON "adblue_entries"("vehicleId");
CREATE INDEX "adblue_entries_tripId_idx" ON "adblue_entries"("tripId");
CREATE INDEX "adblue_entries_driverId_idx" ON "adblue_entries"("driverId");

CREATE UNIQUE INDEX "adblue_stock_transactions_adBlueEntryId_key" ON "adblue_stock_transactions"("adBlueEntryId");
CREATE INDEX "adblue_stock_transactions_stockId_idx" ON "adblue_stock_transactions"("stockId");
CREATE INDEX "adblue_stock_transactions_vehicleId_idx" ON "adblue_stock_transactions"("vehicleId");
CREATE INDEX "adblue_stock_transactions_supplierId_idx" ON "adblue_stock_transactions"("supplierId");
CREATE INDEX "adblue_stock_transactions_transactionDate_idx" ON "adblue_stock_transactions"("transactionDate");

ALTER TABLE "adblue_entries" ADD CONSTRAINT "adblue_entries_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "adblue_entries" ADD CONSTRAINT "adblue_entries_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "adblue_entries" ADD CONSTRAINT "adblue_entries_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "adblue_entries" ADD CONSTRAINT "adblue_entries_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "adblue_entries" ADD CONSTRAINT "adblue_entries_paymentModeId_fkey" FOREIGN KEY ("paymentModeId") REFERENCES "payment_modes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "adblue_stock_transactions" ADD CONSTRAINT "adblue_stock_transactions_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "adblue_stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "adblue_stock_transactions" ADD CONSTRAINT "adblue_stock_transactions_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "adblue_stock_transactions" ADD CONSTRAINT "adblue_stock_transactions_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "adblue_stock_transactions" ADD CONSTRAINT "adblue_stock_transactions_adBlueEntryId_fkey" FOREIGN KEY ("adBlueEntryId") REFERENCES "adblue_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
