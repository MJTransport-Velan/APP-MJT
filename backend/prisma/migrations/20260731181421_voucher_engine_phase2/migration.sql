-- CreateEnum
CREATE TYPE "VoucherStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'POSTED', 'CANCELLED', 'REVERSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VoucherApprovalStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VoucherPostingStatus" AS ENUM ('NOT_QUEUED', 'QUEUED', 'PROCESSING', 'POSTED', 'FAILED');

-- CreateEnum
CREATE TYPE "VoucherSourceModule" AS ENUM ('MANUAL', 'TRIP', 'PAYROLL', 'INVENTORY', 'VEHICLE', 'BANKING', 'LOAN', 'GST');

-- CreateEnum
CREATE TYPE "VoucherReferenceType" AS ENUM ('AGAINST_INVOICE', 'ADVANCE', 'ON_ACCOUNT', 'NEW_REFERENCE', 'ADJUSTMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "VoucherApprovalDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VoucherAttachmentCategory" AS ENUM ('INVOICE', 'BILL_COPY', 'RECEIPT', 'CHEQUE_IMAGE', 'POD', 'SUPPORTING_DOCUMENT', 'TRANSPORT_DOCUMENT', 'SCANNED_COPY', 'OTHER');

-- CreateEnum
CREATE TYPE "VoucherAuditAction" AS ENUM ('CREATED', 'UPDATED', 'FIELD_CHANGED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'POSTED', 'CANCELLED', 'REVERSED');

-- CreateEnum
CREATE TYPE "PostingQueueStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED');

-- AlterEnum
ALTER TYPE "NumberSeriesDocumentType" ADD VALUE 'EXPENSE_VOUCHER';
ALTER TYPE "NumberSeriesDocumentType" ADD VALUE 'SALARY_VOUCHER';
ALTER TYPE "NumberSeriesDocumentType" ADD VALUE 'ADJUSTMENT_VOUCHER';
ALTER TYPE "NumberSeriesDocumentType" ADD VALUE 'LOAN_VOUCHER';
ALTER TYPE "NumberSeriesDocumentType" ADD VALUE 'INTEREST_VOUCHER';
ALTER TYPE "NumberSeriesDocumentType" ADD VALUE 'DEPRECIATION_VOUCHER';
ALTER TYPE "NumberSeriesDocumentType" ADD VALUE 'ASSET_PURCHASE_VOUCHER';
ALTER TYPE "NumberSeriesDocumentType" ADD VALUE 'ASSET_SALE_VOUCHER';

-- CreateTable
CREATE TABLE "voucher_types" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT,
    "numberSeriesDocumentType" "NumberSeriesDocumentType" NOT NULL,
    "numberingMode" "NumberingMode",
    "approvalRequired" BOOLEAN NOT NULL DEFAULT true,
    "postingRequired" BOOLEAN NOT NULL DEFAULT true,
    "editableAfterApproval" BOOLEAN NOT NULL DEFAULT false,
    "allowAttachments" BOOLEAN NOT NULL DEFAULT true,
    "allowCostCenter" BOOLEAN NOT NULL DEFAULT true,
    "allowReference" BOOLEAN NOT NULL DEFAULT true,
    "allowNarration" BOOLEAN NOT NULL DEFAULT true,
    "defaultDebitLedgerId" TEXT,
    "defaultCreditLedgerId" TEXT,
    "isSystemType" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voucher_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vouchers" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "voucherNumber" TEXT NOT NULL,
    "voucherDate" DATE NOT NULL,
    "voucherTypeId" TEXT NOT NULL,
    "financialYearId" TEXT NOT NULL,
    "accountingPeriodId" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "referenceDate" DATE,
    "referenceType" "VoucherReferenceType" NOT NULL DEFAULT 'NEW_REFERENCE',
    "narration" TEXT,
    "status" "VoucherStatus" NOT NULL DEFAULT 'DRAFT',
    "approvalStatus" "VoucherApprovalStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "totalDebit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalCredit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "cancelledById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "reversalOfVoucherId" TEXT,
    "postingStatus" "VoucherPostingStatus" NOT NULL DEFAULT 'NOT_QUEUED',
    "postingDate" TIMESTAMP(3),
    "sourceModule" "VoucherSourceModule" NOT NULL DEFAULT 'MANUAL',
    "sourceDocumentType" TEXT,
    "sourceDocumentId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_lines" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "ledgerId" TEXT NOT NULL,
    "debitAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "creditAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currencyId" TEXT,
    "exchangeRate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "costCenterId" TEXT,
    "partyType" "LedgerPartyType" NOT NULL DEFAULT 'NONE',
    "partyId" TEXT,
    "referenceNumber" TEXT,
    "referenceType" "VoucherReferenceType",
    "narration" TEXT,
    "taxLedgerId" TEXT,
    "taxAmount" DECIMAL(18,2),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voucher_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_approvals" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "approvalRuleId" TEXT,
    "levelNo" INTEGER NOT NULL,
    "approverRoleId" TEXT NOT NULL,
    "actualApproverId" TEXT,
    "decision" "VoucherApprovalDecision" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voucher_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_attachments" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "category" "VoucherAttachmentCategory" NOT NULL DEFAULT 'OTHER',
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT,
    "fileSizeBytes" INTEGER,
    "uploadedById" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "voucher_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_audit_entries" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "action" "VoucherAuditAction" NOT NULL,
    "fieldName" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "reason" TEXT,
    "performedById" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voucher_audit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_templates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "voucherTypeId" TEXT NOT NULL,
    "description" TEXT,
    "isSystemTemplate" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voucher_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_template_lines" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "ledgerId" TEXT NOT NULL,
    "side" "BalanceSide" NOT NULL,
    "defaultCostCenterId" TEXT,
    "defaultNarration" TEXT,

    CONSTRAINT "voucher_template_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posting_queue_entries" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "status" "PostingQueueStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "errorLog" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postedAt" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "posting_queue_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_event_mappings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourceModule" "VoucherSourceModule" NOT NULL,
    "sourceEventCode" TEXT NOT NULL,
    "voucherTypeId" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounting_event_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "voucher_types_organizationId_code_key" ON "voucher_types"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_reversalOfVoucherId_key" ON "vouchers"("reversalOfVoucherId");

-- CreateIndex
CREATE INDEX "vouchers_voucherTypeId_idx" ON "vouchers"("voucherTypeId");

-- CreateIndex
CREATE INDEX "vouchers_financialYearId_idx" ON "vouchers"("financialYearId");

-- CreateIndex
CREATE INDEX "vouchers_accountingPeriodId_idx" ON "vouchers"("accountingPeriodId");

-- CreateIndex
CREATE INDEX "vouchers_status_idx" ON "vouchers"("status");

-- CreateIndex
CREATE INDEX "vouchers_postingStatus_idx" ON "vouchers"("postingStatus");

-- CreateIndex
CREATE INDEX "vouchers_sourceModule_sourceDocumentType_sourceDocumentId_idx" ON "vouchers"("sourceModule", "sourceDocumentType", "sourceDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_organizationId_voucherNumber_key" ON "vouchers"("organizationId", "voucherNumber");

-- CreateIndex
CREATE INDEX "voucher_lines_voucherId_idx" ON "voucher_lines"("voucherId");

-- CreateIndex
CREATE INDEX "voucher_lines_ledgerId_idx" ON "voucher_lines"("ledgerId");

-- CreateIndex
CREATE INDEX "voucher_lines_costCenterId_idx" ON "voucher_lines"("costCenterId");

-- CreateIndex
CREATE INDEX "voucher_lines_partyType_partyId_idx" ON "voucher_lines"("partyType", "partyId");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_approvals_voucherId_levelNo_key" ON "voucher_approvals"("voucherId", "levelNo");

-- CreateIndex
CREATE INDEX "voucher_attachments_voucherId_idx" ON "voucher_attachments"("voucherId");

-- CreateIndex
CREATE INDEX "voucher_audit_entries_voucherId_idx" ON "voucher_audit_entries"("voucherId");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_templates_organizationId_code_key" ON "voucher_templates"("organizationId", "code");

-- CreateIndex
CREATE INDEX "voucher_template_lines_templateId_idx" ON "voucher_template_lines"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "posting_queue_entries_voucherId_key" ON "posting_queue_entries"("voucherId");

-- CreateIndex
CREATE UNIQUE INDEX "accounting_event_mappings_organizationId_sourceModule_sourc_key" ON "accounting_event_mappings"("organizationId", "sourceModule", "sourceEventCode");

-- AddForeignKey
ALTER TABLE "voucher_types" ADD CONSTRAINT "voucher_types_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_types" ADD CONSTRAINT "voucher_types_defaultDebitLedgerId_fkey" FOREIGN KEY ("defaultDebitLedgerId") REFERENCES "ledgers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_types" ADD CONSTRAINT "voucher_types_defaultCreditLedgerId_fkey" FOREIGN KEY ("defaultCreditLedgerId") REFERENCES "ledgers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_voucherTypeId_fkey" FOREIGN KEY ("voucherTypeId") REFERENCES "voucher_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_financialYearId_fkey" FOREIGN KEY ("financialYearId") REFERENCES "financial_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_accountingPeriodId_fkey" FOREIGN KEY ("accountingPeriodId") REFERENCES "accounting_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_reversalOfVoucherId_fkey" FOREIGN KEY ("reversalOfVoucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_lines" ADD CONSTRAINT "voucher_lines_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_lines" ADD CONSTRAINT "voucher_lines_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "ledgers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_lines" ADD CONSTRAINT "voucher_lines_taxLedgerId_fkey" FOREIGN KEY ("taxLedgerId") REFERENCES "ledgers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_lines" ADD CONSTRAINT "voucher_lines_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_lines" ADD CONSTRAINT "voucher_lines_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_approvals" ADD CONSTRAINT "voucher_approvals_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_approvals" ADD CONSTRAINT "voucher_approvals_approvalRuleId_fkey" FOREIGN KEY ("approvalRuleId") REFERENCES "approval_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_attachments" ADD CONSTRAINT "voucher_attachments_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_audit_entries" ADD CONSTRAINT "voucher_audit_entries_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_templates" ADD CONSTRAINT "voucher_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_templates" ADD CONSTRAINT "voucher_templates_voucherTypeId_fkey" FOREIGN KEY ("voucherTypeId") REFERENCES "voucher_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_template_lines" ADD CONSTRAINT "voucher_template_lines_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "voucher_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_template_lines" ADD CONSTRAINT "voucher_template_lines_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "ledgers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_template_lines" ADD CONSTRAINT "voucher_template_lines_defaultCostCenterId_fkey" FOREIGN KEY ("defaultCostCenterId") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posting_queue_entries" ADD CONSTRAINT "posting_queue_entries_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_event_mappings" ADD CONSTRAINT "accounting_event_mappings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_event_mappings" ADD CONSTRAINT "accounting_event_mappings_voucherTypeId_fkey" FOREIGN KEY ("voucherTypeId") REFERENCES "voucher_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
