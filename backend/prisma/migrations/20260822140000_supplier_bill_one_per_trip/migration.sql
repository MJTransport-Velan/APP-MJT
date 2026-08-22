-- A trip can carry only one live supplier bill.
--
-- supplier-bill.service.ts validated the trip but never asked whether it had
-- already been billed, so the same completed trip could be billed repeatedly,
-- each bill carrying its full supplier rate. The payable — and therefore what
-- the supplier could be paid — multiplied with every repeat.
--
-- CANCELLED bills are excluded so a mis-raised bill can still be voided and
-- the trip billed again.
CREATE UNIQUE INDEX "supplier_bills_one_live_per_trip"
  ON "supplier_bills" ("tripId")
  WHERE "tripId" IS NOT NULL
    AND "deletedAt" IS NULL
    AND "status" <> 'CANCELLED';
