-- AdBlue as a first-class Financial Entry purpose, with the same Fleet
-- linkage FUEL and TOLL already have: an EXPENSE against a vehicle also
-- logs a real DIRECT_PURCHASE AdBlueEntry, so the AdBlue module sees the
-- top-up instead of it existing only as a line on the Financial Entry
-- screen.
--
-- Buying AdBlue into the yard store is deliberately NOT this purpose — the
-- Stock tab debits Bank/Cash itself, and recording it here as well would
-- count the same money twice.

ALTER TYPE "FinancialEntryPurpose" ADD VALUE 'ADBLUE';

ALTER TABLE "financial_entries" ADD COLUMN "adBlueEntryId" TEXT;

CREATE UNIQUE INDEX "financial_entries_adBlueEntryId_key" ON "financial_entries"("adBlueEntryId");

ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_adBlueEntryId_fkey" FOREIGN KEY ("adBlueEntryId") REFERENCES "adblue_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
