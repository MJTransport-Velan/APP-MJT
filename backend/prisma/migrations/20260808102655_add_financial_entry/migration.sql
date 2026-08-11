-- CreateEnum
CREATE TYPE "FinancialEntryType" AS ENUM ('MONEY_RECEIVED', 'MONEY_PAID', 'MONEY_TRANSFER', 'EXPENSE', 'ADVANCE_RECEIVED', 'ADVANCE_GIVEN', 'REFUND_RECEIVED', 'REFUND_PAID', 'LOAN_RECEIVED', 'LOAN_REPAYMENT', 'SALARY_SETTLEMENT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "FinancialPartyType" AS ENUM ('CUSTOMER', 'SUPPLIER', 'DRIVER', 'EMPLOYEE', 'BANK', 'CASH', 'LOAN_PROVIDER', 'VEHICLE', 'TRIP', 'EXPENSE', 'OTHER');

-- CreateEnum
CREATE TYPE "FinancialEntryStatus" AS ENUM ('DRAFT', 'COMPLETED', 'PARTIALLY_ALLOCATED', 'FULLY_ALLOCATED', 'CANCELLED', 'REVERSED');

-- CreateEnum
CREATE TYPE "FinancialEntryPurpose" AS ENUM ('TRIP_ADVANCE', 'TRIP_PAYMENT', 'SUPPLIER_PAYMENT', 'DRIVER_ADVANCE', 'SALARY', 'FUEL', 'REPAIR', 'INSURANCE', 'LOAN_EMI', 'CUSTOMER_REFUND', 'SUPPLIER_REFUND', 'OFFICE_EXPENSE', 'OTHER');

-- AlterEnum
ALTER TYPE "VoucherSourceModule" ADD VALUE 'FINANCIAL_ENTRY';

-- CreateTable
CREATE TABLE "financial_entries" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entryNumber" TEXT NOT NULL,
    "entryType" "FinancialEntryType" NOT NULL,
    "entryDate" DATE NOT NULL,
    "sourceType" "FinancialPartyType" NOT NULL,
    "sourceId" TEXT,
    "sourceLabel" TEXT NOT NULL,
    "destinationType" "FinancialPartyType" NOT NULL,
    "destinationId" TEXT,
    "destinationLabel" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "allocatedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "paymentModeId" TEXT,
    "referenceNumber" TEXT,
    "remarks" TEXT,
    "purpose" "FinancialEntryPurpose" NOT NULL DEFAULT 'OTHER',
    "purposeNotes" TEXT,
    "status" "FinancialEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "voucherId" TEXT,
    "sourceDocumentType" TEXT,
    "sourceDocumentId" TEXT,
    "correctionOfId" TEXT,
    "reversalOfId" TEXT,
    "cancelledById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "financial_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_allocations" (
    "id" TEXT NOT NULL,
    "financialEntryId" TEXT NOT NULL,
    "targetType" "FinancialPartyType" NOT NULL,
    "targetId" TEXT,
    "targetLabel" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "purpose" "FinancialEntryPurpose" NOT NULL DEFAULT 'OTHER',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "financial_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "financial_entries_voucherId_key" ON "financial_entries"("voucherId");

-- CreateIndex
CREATE UNIQUE INDEX "financial_entries_correctionOfId_key" ON "financial_entries"("correctionOfId");

-- CreateIndex
CREATE UNIQUE INDEX "financial_entries_reversalOfId_key" ON "financial_entries"("reversalOfId");

-- CreateIndex
CREATE INDEX "financial_entries_organizationId_entryType_idx" ON "financial_entries"("organizationId", "entryType");

-- CreateIndex
CREATE INDEX "financial_entries_sourceType_sourceId_idx" ON "financial_entries"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "financial_entries_destinationType_destinationId_idx" ON "financial_entries"("destinationType", "destinationId");

-- CreateIndex
CREATE INDEX "financial_entries_status_idx" ON "financial_entries"("status");

-- CreateIndex
CREATE UNIQUE INDEX "financial_entries_organizationId_entryNumber_key" ON "financial_entries"("organizationId", "entryNumber");

-- CreateIndex
CREATE INDEX "financial_allocations_financialEntryId_idx" ON "financial_allocations"("financialEntryId");

-- CreateIndex
CREATE INDEX "financial_allocations_targetType_targetId_idx" ON "financial_allocations"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_paymentModeId_fkey" FOREIGN KEY ("paymentModeId") REFERENCES "payment_modes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_correctionOfId_fkey" FOREIGN KEY ("correctionOfId") REFERENCES "financial_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "financial_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_allocations" ADD CONSTRAINT "financial_allocations_financialEntryId_fkey" FOREIGN KEY ("financialEntryId") REFERENCES "financial_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

