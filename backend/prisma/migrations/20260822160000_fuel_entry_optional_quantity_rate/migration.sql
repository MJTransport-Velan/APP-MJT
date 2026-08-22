-- A fuel entry can now be recorded from whatever the operator actually has:
-- the amount paid, the litres taken, or litres + rate. The two that are not
-- supplied are derived where possible and left null where not, so all three
-- columns become nullable.
--
-- Widening only — every existing row keeps its values.
ALTER TABLE "fuel_entries" ALTER COLUMN "quantityLiters" DROP NOT NULL;
ALTER TABLE "fuel_entries" ALTER COLUMN "ratePerLiter" DROP NOT NULL;
ALTER TABLE "fuel_entries" ALTER COLUMN "totalAmount" DROP NOT NULL;
