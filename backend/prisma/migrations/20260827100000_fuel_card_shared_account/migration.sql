-- One shared prepaid account behind every diesel/fuel card in the fleet:
-- one recharge tops up one balance, and any card draws down from that same
-- balance. Mirrors the FastTag shared wallet — there is deliberately no
-- per-card balance, because the cards share the money.

CREATE TYPE "FuelCardTransactionType" AS ENUM ('RECHARGE', 'USAGE', 'REFUND', 'ADJUSTMENT');

CREATE TABLE "fuel_card_accounts" (
    "id" TEXT NOT NULL,
    "accountRef" TEXT,
    "currentBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fuel_card_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fuel_card_transactions" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "fuelCardId" TEXT,
    "vehicleId" TEXT,
    -- Set on the USAGE row a card-billed fuel entry owns, so editing or
    -- deleting that fill can find its drawdown and keep the balance in step.
    "fuelEntryId" TEXT,
    "type" "FuelCardTransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referenceNumber" TEXT,
    "remarks" TEXT,
    -- Which Bank/Cash account a RECHARGE debited, so edit/delete can reverse it.
    "fundAccountType" TEXT,
    "fundAccountId" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fuel_card_transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fuel_card_transactions_fuelEntryId_key" ON "fuel_card_transactions"("fuelEntryId");
CREATE INDEX "fuel_card_transactions_accountId_idx" ON "fuel_card_transactions"("accountId");
CREATE INDEX "fuel_card_transactions_fuelCardId_idx" ON "fuel_card_transactions"("fuelCardId");
CREATE INDEX "fuel_card_transactions_vehicleId_idx" ON "fuel_card_transactions"("vehicleId");
CREATE INDEX "fuel_card_transactions_transactionDate_idx" ON "fuel_card_transactions"("transactionDate");

ALTER TABLE "fuel_card_transactions" ADD CONSTRAINT "fuel_card_transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "fuel_card_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fuel_card_transactions" ADD CONSTRAINT "fuel_card_transactions_fuelCardId_fkey" FOREIGN KEY ("fuelCardId") REFERENCES "fuel_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "fuel_card_transactions" ADD CONSTRAINT "fuel_card_transactions_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "fuel_card_transactions" ADD CONSTRAINT "fuel_card_transactions_fuelEntryId_fkey" FOREIGN KEY ("fuelEntryId") REFERENCES "fuel_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
