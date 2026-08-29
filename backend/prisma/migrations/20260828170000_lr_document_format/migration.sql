-- CreateEnum
CREATE TYPE "LrTransportMode" AS ENUM ('ROAD', 'RAIL', 'AIR', 'SEA');

-- CreateEnum
CREATE TYPE "LrFreightPayment" AS ENUM ('TO_PAY', 'PAID', 'TO_BE_BILLED');

-- CreateEnum
CREATE TYPE "LrParty" AS ENUM ('CONSIGNOR', 'CONSIGNEE', 'THIRD_PARTY');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "advanceReceived" DECIMAL(12,2),
ADD COLUMN     "billingParty" "LrParty",
ADD COLUMN     "consigneeAddress" TEXT,
ADD COLUMN     "consigneeGstin" TEXT,
ADD COLUMN     "consigneeName" TEXT,
ADD COLUMN     "consigneePhone" TEXT,
ADD COLUMN     "consignorGstin" TEXT,
ADD COLUMN     "dispatchAt" TIMESTAMP(3),
ADD COLUMN     "freightCharges" DECIMAL(12,2),
ADD COLUMN     "freightPayer" "LrParty",
ADD COLUMN     "freightPayment" "LrFreightPayment",
ADD COLUMN     "loadingCharges" DECIMAL(12,2),
ADD COLUMN     "otherCharges" DECIMAL(12,2),
ADD COLUMN     "paymentTerm" TEXT,
ADD COLUMN     "remarks" TEXT,
ADD COLUMN     "transportMode" "LrTransportMode",
ADD COLUMN     "unloadingCharges" DECIMAL(12,2);

-- CreateTable
CREATE TABLE "booking_goods_items" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "invoiceNo" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "description" TEXT NOT NULL,
    "units" INTEGER NOT NULL DEFAULT 0,
    "goodsValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ewayBillNo" TEXT,
    "ewayBillDate" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_goods_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "booking_goods_items_bookingId_idx" ON "booking_goods_items"("bookingId");

-- AddForeignKey
ALTER TABLE "booking_goods_items" ADD CONSTRAINT "booking_goods_items_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing LR numbers were issued under the old LR<YYYYMMDD><NNNN> series and
-- are left exactly as they are: an LR number that has already been printed and
-- handed to a driver must never be rewritten. The MJT/YY-YY/NNNN series starts
-- from the next number issued.
