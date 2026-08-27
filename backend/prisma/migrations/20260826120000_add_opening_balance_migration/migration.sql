-- Phase 18 — Opening Balance & Migration.
--
-- Brings MJ Transport's closing position in the old Tally books across as
-- this system's OPENING position, without recreating any historical
-- transaction. Nothing here writes a FinancialEntry, so opening amounts
-- can never show up as current-period income or expense.
--
-- Additive only: two new tables plus nullable/defaulted columns on
-- fixed_assets and loans. No existing row changes meaning — every asset
-- already in the register is a NEW_PURCHASE and every loan is a NEW loan,
-- which is exactly what they were before this migration existed.

CREATE TYPE "MigrationStatus" AS ENUM ('DRAFT', 'FINALIZED');
CREATE TYPE "AssetOrigin" AS ENUM ('OPENING', 'NEW_PURCHASE');
CREATE TYPE "LoanOrigin" AS ENUM ('OPENING', 'NEW');
CREATE TYPE "MigrationRecordStatus" AS ENUM ('CONFIRMED', 'NEEDS_REVIEW', 'UNVERIFIED', 'RECLASSIFIED');
CREATE TYPE "OpeningBalanceCategory" AS ENUM ('BANK', 'CASH', 'RECEIVABLE', 'PAYABLE', 'OWNER_FUNDS', 'OTHER_ASSET', 'OTHER_LIABILITY', 'OTHER_EQUITY');
CREATE TYPE "OpeningFundClassification" AS ENUM ('CAPITAL', 'OWNER_LOAN', 'OTHER_LIABILITY', 'UNCLASSIFIED');

-- Asset Register: an OPENING asset carries its original cost in
-- purchaseValue and its migration-date book value in currentValue, so
-- accumulated depreciation is the difference and is never stored twice.
ALTER TABLE "fixed_assets" ADD COLUMN "assetOrigin" "AssetOrigin" NOT NULL DEFAULT 'NEW_PURCHASE';
ALTER TABLE "fixed_assets" ADD COLUMN "openingDate" TIMESTAMP(3);
ALTER TABLE "fixed_assets" ADD COLUMN "migrationSource" TEXT;
ALTER TABLE "fixed_assets" ADD COLUMN "migrationStatus" "MigrationRecordStatus";

-- Loan Register: an OPENING loan's principalAmount is what is STILL OWED
-- at migration, so the live outstanding maths needs no special case.
ALTER TABLE "loans" ADD COLUMN "origin" "LoanOrigin" NOT NULL DEFAULT 'NEW';
ALTER TABLE "loans" ADD COLUMN "originalPrincipal" DECIMAL(14,2);
ALTER TABLE "loans" ADD COLUMN "openingAsOfDate" TIMESTAMP(3);
ALTER TABLE "loans" ADD COLUMN "migrationSource" TEXT;
ALTER TABLE "loans" ADD COLUMN "migrationStatus" "MigrationRecordStatus";

CREATE TABLE "financial_migrations" (
    "id" TEXT NOT NULL,
    "migrationDate" DATE NOT NULL,
    "previousSystem" TEXT NOT NULL DEFAULT 'Tally',
    "previousClosingDate" DATE,
    "notes" TEXT,
    "status" "MigrationStatus" NOT NULL DEFAULT 'DRAFT',
    "finalizedAt" TIMESTAMP(3),
    "finalizedById" TEXT,
    "organizationId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_migrations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "opening_balances" (
    "id" TEXT NOT NULL,
    "migrationId" TEXT NOT NULL,
    "category" "OpeningBalanceCategory" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "bankAccountId" TEXT,
    "cashAccountId" TEXT,
    "companyId" TEXT,
    "supplierId" TEXT,
    "capitalPartnerId" TEXT,
    "label" TEXT,
    "classification" "OpeningFundClassification",
    "status" "MigrationRecordStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "source" TEXT NOT NULL DEFAULT 'Tally Migration',
    "referenceNumber" TEXT,
    "referenceDate" TIMESTAMP(3),
    "remarks" TEXT,
    "appliedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "organizationId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opening_balances_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "opening_balances_migrationId_idx" ON "opening_balances"("migrationId");
CREATE INDEX "opening_balances_category_idx" ON "opening_balances"("category");
CREATE INDEX "opening_balances_companyId_idx" ON "opening_balances"("companyId");
CREATE INDEX "opening_balances_supplierId_idx" ON "opening_balances"("supplierId");

ALTER TABLE "opening_balances" ADD CONSTRAINT "opening_balances_migrationId_fkey" FOREIGN KEY ("migrationId") REFERENCES "financial_migrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "opening_balances" ADD CONSTRAINT "opening_balances_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "opening_balances" ADD CONSTRAINT "opening_balances_cashAccountId_fkey" FOREIGN KEY ("cashAccountId") REFERENCES "cash_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "opening_balances" ADD CONSTRAINT "opening_balances_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "opening_balances" ADD CONSTRAINT "opening_balances_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "opening_balances" ADD CONSTRAINT "opening_balances_capitalPartnerId_fkey" FOREIGN KEY ("capitalPartnerId") REFERENCES "capital_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
