-- CreateEnum
CREATE TYPE "InvoiceChargeType" AS ENUM ('FUEL_RECOVERY', 'DETENTION', 'LOADING', 'UNLOADING', 'DISCOUNT', 'ROUND_OFF', 'OTHER');

-- CreateEnum
CREATE TYPE "CustomerCreditNoteCategory" AS ENUM ('RATE_DIFFERENCE', 'SERVICE_CANCELLATION', 'DAMAGE', 'SHORT_DELIVERY', 'DISCOUNT', 'BILLING_CORRECTION', 'OTHER');

-- CreateEnum
CREATE TYPE "CustomerDebitNoteCategory" AS ENUM ('ADDITIONAL_CHARGES', 'PENALTY', 'INTEREST', 'FUEL_DIFFERENCE', 'SHORT_COLLECTION', 'OTHER');

-- CreateEnum
CREATE TYPE "SupplierBillStatus" AS ENUM ('DRAFT', 'GENERATED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupplierCreditNoteCategory" AS ENUM ('BILL_CORRECTION', 'RATE_REVISION', 'DISCOUNT', 'ADJUSTMENT', 'REFUND', 'OTHER');

-- CreateEnum
CREATE TYPE "SupplierDebitNoteCategory" AS ENUM ('DAMAGE_RECOVERY', 'PENALTY', 'SHORT_DELIVERY', 'QUALITY_ISSUE', 'FUEL_RECOVERY', 'COMMISSION_RECOVERY', 'OTHER');

-- CreateEnum
CREATE TYPE "CollectionActivityType" AS ENUM ('CALL', 'EMAIL', 'REMINDER', 'PROMISE_TO_PAY', 'NOTE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "VoucherSourceModule" ADD VALUE 'RECEIVABLES';
ALTER TYPE "VoucherSourceModule" ADD VALUE 'PAYABLES';

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "blockedAt" TIMESTAMP(3),
ADD COLUMN     "blockedById" TEXT,
ADD COLUMN     "blockedReason" TEXT,
ADD COLUMN     "creditDays" INTEGER,
ADD COLUMN     "creditLimit" DECIMAL(12,2),
ADD COLUMN     "isBlocked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "credit_notes" ADD COLUMN     "category" "CustomerCreditNoteCategory" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "voucherId" TEXT;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "accountingPeriodId" TEXT,
ADD COLUMN     "creditPeriodDays" INTEGER,
ADD COLUMN     "customerLedgerId" TEXT,
ADD COLUMN     "financialYearId" TEXT,
ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "voucherId" TEXT;

-- AlterTable
ALTER TABLE "receipts" ADD COLUMN     "chequeId" TEXT,
ADD COLUMN     "fundAccountId" TEXT,
ADD COLUMN     "fundAccountType" "FundAccountType",
ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "voucherId" TEXT;

-- AlterTable
ALTER TABLE "supplier_payments" ADD COLUMN     "billId" TEXT,
ADD COLUMN     "chequeId" TEXT,
ADD COLUMN     "fundAccountId" TEXT,
ADD COLUMN     "fundAccountType" "FundAccountType",
ADD COLUMN     "isRetentionRelease" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "voucherId" TEXT;

-- CreateTable
CREATE TABLE "invoice_charges" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "chargeType" "InvoiceChargeType" NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_debit_notes" (
    "id" TEXT NOT NULL,
    "debitNoteNumber" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "category" "CustomerDebitNoteCategory" NOT NULL DEFAULT 'OTHER',
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "debitNoteDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voucherId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_debit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_bills" (
    "id" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "tripId" TEXT,
    "organizationId" TEXT,
    "financialYearId" TEXT,
    "accountingPeriodId" TEXT,
    "supplierLedgerId" TEXT,
    "billDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "subtotal" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "retentionAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "outstandingAmount" DECIMAL(12,2) NOT NULL,
    "status" "SupplierBillStatus" NOT NULL DEFAULT 'DRAFT',
    "voucherId" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_credit_notes" (
    "id" TEXT NOT NULL,
    "creditNoteNumber" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "category" "SupplierCreditNoteCategory" NOT NULL DEFAULT 'OTHER',
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "creditNoteDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voucherId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_credit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_debit_notes" (
    "id" TEXT NOT NULL,
    "debitNoteNumber" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "category" "SupplierDebitNoteCategory" NOT NULL DEFAULT 'OTHER',
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "debitNoteDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voucherId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_debit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_activities" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "activityType" "CollectionActivityType" NOT NULL,
    "notes" TEXT,
    "promisedAmount" DECIMAL(12,2),
    "promisedDate" TIMESTAMP(3),
    "followUpDate" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoice_charges_invoiceId_idx" ON "invoice_charges"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_debit_notes_debitNoteNumber_key" ON "customer_debit_notes"("debitNoteNumber");

-- CreateIndex
CREATE UNIQUE INDEX "customer_debit_notes_voucherId_key" ON "customer_debit_notes"("voucherId");

-- CreateIndex
CREATE INDEX "customer_debit_notes_invoiceId_idx" ON "customer_debit_notes"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_bills_billNumber_key" ON "supplier_bills"("billNumber");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_bills_voucherId_key" ON "supplier_bills"("voucherId");

-- CreateIndex
CREATE INDEX "supplier_bills_supplierId_idx" ON "supplier_bills"("supplierId");

-- CreateIndex
CREATE INDEX "supplier_bills_tripId_idx" ON "supplier_bills"("tripId");

-- CreateIndex
CREATE INDEX "supplier_bills_status_idx" ON "supplier_bills"("status");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_credit_notes_creditNoteNumber_key" ON "supplier_credit_notes"("creditNoteNumber");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_credit_notes_voucherId_key" ON "supplier_credit_notes"("voucherId");

-- CreateIndex
CREATE INDEX "supplier_credit_notes_billId_idx" ON "supplier_credit_notes"("billId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_debit_notes_debitNoteNumber_key" ON "supplier_debit_notes"("debitNoteNumber");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_debit_notes_voucherId_key" ON "supplier_debit_notes"("voucherId");

-- CreateIndex
CREATE INDEX "supplier_debit_notes_billId_idx" ON "supplier_debit_notes"("billId");

-- CreateIndex
CREATE INDEX "collection_activities_companyId_idx" ON "collection_activities"("companyId");

-- CreateIndex
CREATE INDEX "collection_activities_invoiceId_idx" ON "collection_activities"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "credit_notes_voucherId_key" ON "credit_notes"("voucherId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_voucherId_key" ON "invoices"("voucherId");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_voucherId_key" ON "receipts"("voucherId");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_chequeId_key" ON "receipts"("chequeId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_payments_voucherId_key" ON "supplier_payments"("voucherId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_payments_chequeId_key" ON "supplier_payments"("chequeId");

-- CreateIndex
CREATE INDEX "supplier_payments_billId_idx" ON "supplier_payments"("billId");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_financialYearId_fkey" FOREIGN KEY ("financialYearId") REFERENCES "financial_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_accountingPeriodId_fkey" FOREIGN KEY ("accountingPeriodId") REFERENCES "accounting_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customerLedgerId_fkey" FOREIGN KEY ("customerLedgerId") REFERENCES "ledgers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_charges" ADD CONSTRAINT "invoice_charges_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_debit_notes" ADD CONSTRAINT "customer_debit_notes_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_debit_notes" ADD CONSTRAINT "customer_debit_notes_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_chequeId_fkey" FOREIGN KEY ("chequeId") REFERENCES "cheques"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_bills" ADD CONSTRAINT "supplier_bills_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_bills" ADD CONSTRAINT "supplier_bills_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_bills" ADD CONSTRAINT "supplier_bills_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_bills" ADD CONSTRAINT "supplier_bills_financialYearId_fkey" FOREIGN KEY ("financialYearId") REFERENCES "financial_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_bills" ADD CONSTRAINT "supplier_bills_accountingPeriodId_fkey" FOREIGN KEY ("accountingPeriodId") REFERENCES "accounting_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_bills" ADD CONSTRAINT "supplier_bills_supplierLedgerId_fkey" FOREIGN KEY ("supplierLedgerId") REFERENCES "ledgers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_bills" ADD CONSTRAINT "supplier_bills_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_credit_notes" ADD CONSTRAINT "supplier_credit_notes_billId_fkey" FOREIGN KEY ("billId") REFERENCES "supplier_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_credit_notes" ADD CONSTRAINT "supplier_credit_notes_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_debit_notes" ADD CONSTRAINT "supplier_debit_notes_billId_fkey" FOREIGN KEY ("billId") REFERENCES "supplier_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_debit_notes" ADD CONSTRAINT "supplier_debit_notes_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_billId_fkey" FOREIGN KEY ("billId") REFERENCES "supplier_bills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_chequeId_fkey" FOREIGN KEY ("chequeId") REFERENCES "cheques"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_activities" ADD CONSTRAINT "collection_activities_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_activities" ADD CONSTRAINT "collection_activities_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
