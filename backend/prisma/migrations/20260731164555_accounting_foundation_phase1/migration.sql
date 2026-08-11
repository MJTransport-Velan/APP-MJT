-- CreateEnum
CREATE TYPE "ExchangeRateSource" AS ENUM ('MANUAL', 'API');

-- CreateEnum
CREATE TYPE "FinancialYearStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'LOCKED');

-- CreateEnum
CREATE TYPE "AccountingPeriodType" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AccountingPeriodStatus" AS ENUM ('OPEN', 'CLOSED', 'LOCKED', 'FROZEN');

-- CreateEnum
CREATE TYPE "AccountClassification" AS ENUM ('ASSET', 'LIABILITY', 'INCOME', 'EXPENSE', 'EQUITY');

-- CreateEnum
CREATE TYPE "BalanceSide" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "LedgerPartyType" AS ENUM ('NONE', 'CUSTOMER', 'SUPPLIER', 'DRIVER', 'EMPLOYEE', 'BANK', 'VEHICLE', 'OTHER');

-- CreateEnum
CREATE TYPE "CostCenterRefType" AS ENUM ('NONE', 'VEHICLE', 'DRIVER', 'SUPPLIER', 'TRIP', 'OTHER');

-- CreateEnum
CREATE TYPE "NumberingMode" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "NumberSeriesDocumentType" AS ENUM ('LEDGER', 'COST_CENTER', 'JOURNAL_VOUCHER', 'RECEIPT_VOUCHER', 'PAYMENT_VOUCHER', 'SALES_VOUCHER', 'PURCHASE_VOUCHER', 'DEBIT_NOTE', 'CREDIT_NOTE', 'CONTRA_VOUCHER', 'OPENING_BALANCE_VOUCHER');

-- CreateEnum
CREATE TYPE "NumberSeriesResetFrequency" AS ENUM ('NEVER', 'FINANCIAL_YEAR', 'MONTHLY');

-- CreateEnum
CREATE TYPE "ApprovalModule" AS ENUM ('LEDGER_CREATION', 'COST_CENTER_CREATION', 'VOUCHER');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gstNumber" TEXT,
    "panNumber" TEXT,
    "tanNumber" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currencies" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT,
    "decimalPrecision" INTEGER NOT NULL DEFAULT 2,
    "isBaseCurrency" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "rateDate" DATE NOT NULL,
    "rateToBase" DECIMAL(18,6) NOT NULL,
    "source" "ExchangeRateSource" NOT NULL DEFAULT 'MANUAL',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_years" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "booksBeginDate" DATE NOT NULL,
    "previousFinancialYearId" TEXT,
    "status" "FinancialYearStatus" NOT NULL DEFAULT 'DRAFT',
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lockedById" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "financial_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_periods" (
    "id" TEXT NOT NULL,
    "financialYearId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "periodType" "AccountingPeriodType" NOT NULL,
    "sequenceNo" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "AccountingPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounting_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_groups" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentGroupId" TEXT,
    "classification" "AccountClassification" NOT NULL,
    "path" TEXT NOT NULL DEFAULT '',
    "level" INTEGER NOT NULL DEFAULT 0,
    "isSystemGroup" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledgers" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountGroupId" TEXT NOT NULL,
    "classification" "AccountClassification" NOT NULL,
    "normalBalance" "BalanceSide" NOT NULL,
    "currencyId" TEXT,
    "openingBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "openingBalanceType" "BalanceSide" NOT NULL DEFAULT 'DEBIT',
    "partyType" "LedgerPartyType" NOT NULL DEFAULT 'NONE',
    "partyId" TEXT,
    "gstNumber" TEXT,
    "panNumber" TEXT,
    "tanNumber" TEXT,
    "bankName" TEXT,
    "bankAccountNumber" TEXT,
    "bankIfsc" TEXT,
    "bankBranch" TEXT,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "creditPeriodDays" INTEGER,
    "creditLimit" DECIMAL(18,2),
    "isSystemLedger" BOOLEAN NOT NULL DEFAULT false,
    "isEditable" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystemCategory" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cost_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_centers" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "costCategoryId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentCostCenterId" TEXT,
    "path" TEXT NOT NULL DEFAULT '',
    "level" INTEGER NOT NULL DEFAULT 0,
    "refType" "CostCenterRefType" NOT NULL DEFAULT 'NONE',
    "refId" TEXT,
    "isSystemCostCenter" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_preferences" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "baseCurrencyId" TEXT,
    "decimalPrecision" INTEGER NOT NULL DEFAULT 2,
    "negativeCashAllowed" BOOLEAN NOT NULL DEFAULT false,
    "backDateEntryAllowed" BOOLEAN NOT NULL DEFAULT true,
    "backDateAllowedDays" INTEGER NOT NULL DEFAULT 7,
    "voucherApprovalRequired" BOOLEAN NOT NULL DEFAULT true,
    "numberingMode" "NumberingMode" NOT NULL DEFAULT 'AUTO',
    "costCenterMandatory" BOOLEAN NOT NULL DEFAULT false,
    "narrationMandatory" BOOLEAN NOT NULL DEFAULT false,
    "attachmentMandatory" BOOLEAN NOT NULL DEFAULT false,
    "allowDuplicateReference" BOOLEAN NOT NULL DEFAULT false,
    "financialLockDays" INTEGER NOT NULL DEFAULT 0,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounting_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "number_series" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "documentType" "NumberSeriesDocumentType" NOT NULL,
    "financialYearId" TEXT,
    "prefix" TEXT,
    "suffix" TEXT,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "padWidth" INTEGER NOT NULL DEFAULT 5,
    "resetFrequency" "NumberSeriesResetFrequency" NOT NULL DEFAULT 'NEVER',
    "lastResetPeriod" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "number_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opening_balance_entries" (
    "id" TEXT NOT NULL,
    "financialYearId" TEXT NOT NULL,
    "ledgerId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "balanceType" "BalanceSide" NOT NULL,
    "narration" TEXT,
    "isCarryForward" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "enteredById" TEXT,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedById" TEXT,
    "lockedAt" TIMESTAMP(3),

    CONSTRAINT "opening_balance_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_rules" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "module" "ApprovalModule" NOT NULL,
    "voucherType" TEXT,
    "minAmount" DECIMAL(18,2),
    "maxAmount" DECIMAL(18,2),
    "approverRoleId" TEXT NOT NULL,
    "sequenceOrder" INTEGER NOT NULL DEFAULT 1,
    "autoApproveBelow" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "period_lock_overrides" (
    "id" TEXT NOT NULL,
    "accountingPeriodId" TEXT NOT NULL,
    "overriddenById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "overriddenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revertedAt" TIMESTAMP(3),

    CONSTRAINT "period_lock_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_code_key" ON "organizations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "currencies_code_key" ON "currencies"("code");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_currencyId_rateDate_key" ON "exchange_rates"("currencyId", "rateDate");

-- CreateIndex
CREATE INDEX "financial_years_organizationId_idx" ON "financial_years"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "financial_years_organizationId_code_key" ON "financial_years"("organizationId", "code");

-- CreateIndex
CREATE INDEX "accounting_periods_organizationId_startDate_endDate_idx" ON "accounting_periods"("organizationId", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "accounting_periods_financialYearId_sequenceNo_key" ON "accounting_periods"("financialYearId", "sequenceNo");

-- CreateIndex
CREATE INDEX "account_groups_organizationId_parentGroupId_idx" ON "account_groups"("organizationId", "parentGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "account_groups_organizationId_code_key" ON "account_groups"("organizationId", "code");

-- CreateIndex
CREATE INDEX "ledgers_accountGroupId_idx" ON "ledgers"("accountGroupId");

-- CreateIndex
CREATE INDEX "ledgers_partyType_partyId_idx" ON "ledgers"("partyType", "partyId");

-- CreateIndex
CREATE UNIQUE INDEX "ledgers_organizationId_code_key" ON "ledgers"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "cost_categories_code_key" ON "cost_categories"("code");

-- CreateIndex
CREATE INDEX "cost_centers_organizationId_parentCostCenterId_idx" ON "cost_centers"("organizationId", "parentCostCenterId");

-- CreateIndex
CREATE INDEX "cost_centers_refType_refId_idx" ON "cost_centers"("refType", "refId");

-- CreateIndex
CREATE UNIQUE INDEX "cost_centers_organizationId_code_key" ON "cost_centers"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "accounting_preferences_organizationId_key" ON "accounting_preferences"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "number_series_organizationId_documentType_financialYearId_key" ON "number_series"("organizationId", "documentType", "financialYearId");

-- CreateIndex
CREATE UNIQUE INDEX "opening_balance_entries_financialYearId_ledgerId_key" ON "opening_balance_entries"("financialYearId", "ledgerId");

-- CreateIndex
CREATE INDEX "approval_rules_organizationId_module_idx" ON "approval_rules"("organizationId", "module");

-- CreateIndex
CREATE INDEX "period_lock_overrides_accountingPeriodId_idx" ON "period_lock_overrides"("accountingPeriodId");

-- AddForeignKey
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_years" ADD CONSTRAINT "financial_years_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_years" ADD CONSTRAINT "financial_years_previousFinancialYearId_fkey" FOREIGN KEY ("previousFinancialYearId") REFERENCES "financial_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_financialYearId_fkey" FOREIGN KEY ("financialYearId") REFERENCES "financial_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_groups" ADD CONSTRAINT "account_groups_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_groups" ADD CONSTRAINT "account_groups_parentGroupId_fkey" FOREIGN KEY ("parentGroupId") REFERENCES "account_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledgers" ADD CONSTRAINT "ledgers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledgers" ADD CONSTRAINT "ledgers_accountGroupId_fkey" FOREIGN KEY ("accountGroupId") REFERENCES "account_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledgers" ADD CONSTRAINT "ledgers_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_costCategoryId_fkey" FOREIGN KEY ("costCategoryId") REFERENCES "cost_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_parentCostCenterId_fkey" FOREIGN KEY ("parentCostCenterId") REFERENCES "cost_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_preferences" ADD CONSTRAINT "accounting_preferences_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_preferences" ADD CONSTRAINT "accounting_preferences_baseCurrencyId_fkey" FOREIGN KEY ("baseCurrencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "number_series" ADD CONSTRAINT "number_series_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "number_series" ADD CONSTRAINT "number_series_financialYearId_fkey" FOREIGN KEY ("financialYearId") REFERENCES "financial_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opening_balance_entries" ADD CONSTRAINT "opening_balance_entries_financialYearId_fkey" FOREIGN KEY ("financialYearId") REFERENCES "financial_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opening_balance_entries" ADD CONSTRAINT "opening_balance_entries_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "ledgers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_rules" ADD CONSTRAINT "approval_rules_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_rules" ADD CONSTRAINT "approval_rules_approverRoleId_fkey" FOREIGN KEY ("approverRoleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "period_lock_overrides" ADD CONSTRAINT "period_lock_overrides_accountingPeriodId_fkey" FOREIGN KEY ("accountingPeriodId") REFERENCES "accounting_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

