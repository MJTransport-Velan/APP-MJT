-- CreateEnum
CREATE TYPE "GstTaxCategory" AS ENUM ('TAXABLE', 'EXEMPT', 'ZERO_RATED', 'NIL_RATED');

-- CreateEnum
CREATE TYPE "GstAdjustmentType" AS ENUM ('RCM_LIABILITY', 'ITC_REVERSAL', 'ITC_CLAIM', 'TAX_PAYMENT', 'TAX_REFUND', 'CREDIT_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "GstReturnType" AS ENUM ('GSTR1', 'GSTR3B', 'GSTR9', 'GSTR9C');

-- CreateEnum
CREATE TYPE "GstReturnStatus" AS ENUM ('DRAFT', 'FINALIZED');

-- CreateEnum
CREATE TYPE "TdsApplicability" AS ENUM ('CONTRACTOR', 'PROFESSIONAL', 'RENT', 'COMMISSION', 'TRANSPORT', 'SALARY', 'OTHER');

-- CreateEnum
CREATE TYPE "TdsDeducteeType" AS ENUM ('SUPPLIER', 'DRIVER', 'EMPLOYEE', 'OTHER');

-- CreateEnum
CREATE TYPE "TdsCertificateStatus" AS ENUM ('DRAFT', 'ISSUED');

-- CreateEnum
CREATE TYPE "BudgetScope" AS ENUM ('ORGANIZATION', 'DEPARTMENT', 'BRANCH', 'VEHICLE', 'COST_CENTER');

-- CreateEnum
CREATE TYPE "BudgetType" AS ENUM ('REVENUE', 'EXPENSE', 'BOTH');

-- CreateEnum
CREATE TYPE "BudgetPeriodType" AS ENUM ('ANNUAL', 'MONTHLY');

-- CreateEnum
CREATE TYPE "BudgetStatus" AS ENUM ('DRAFT', 'APPROVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ReportFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('PDF', 'EXCEL', 'CSV');

-- AlterTable
ALTER TABLE "gst_masters" ADD COLUMN     "cessRatePercent" DECIMAL(5,2),
ADD COLUMN     "cgstRatePercent" DECIMAL(5,2),
ADD COLUMN     "hsnSacCode" TEXT,
ADD COLUMN     "igstRatePercent" DECIMAL(5,2),
ADD COLUMN     "isReverseCharge" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sgstRatePercent" DECIMAL(5,2),
ADD COLUMN     "taxCategory" "GstTaxCategory" NOT NULL DEFAULT 'TAXABLE';

-- CreateTable
CREATE TABLE "gst_registrations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "gstin" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "stateName" TEXT NOT NULL,
    "businessPlaceName" TEXT NOT NULL,
    "address" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gst_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_adjustments" (
    "id" TEXT NOT NULL,
    "gstRegistrationId" TEXT NOT NULL,
    "adjustmentType" "GstAdjustmentType" NOT NULL,
    "adjustmentDate" TIMESTAMP(3) NOT NULL,
    "cgstAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "sgstAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "igstAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cessAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "reason" TEXT,
    "fundAccountType" "FundAccountType",
    "fundAccountId" TEXT,
    "voucherId" TEXT,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "organizationId" TEXT,
    "financialYearId" TEXT,
    "accountingPeriodId" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "gst_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_return_periods" (
    "id" TEXT NOT NULL,
    "gstRegistrationId" TEXT NOT NULL,
    "returnType" "GstReturnType" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "GstReturnStatus" NOT NULL DEFAULT 'DRAFT',
    "totalTaxableValue" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "totalCgst" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "totalSgst" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "totalIgst" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "totalCess" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "totalItcClaimed" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "netTaxPayable" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedById" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "finalizedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gst_return_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tds_sections" (
    "id" TEXT NOT NULL,
    "sectionCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ratePercent" DECIMAL(5,2) NOT NULL,
    "thresholdAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "applicableTo" "TdsApplicability" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tds_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tds_deductions" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "deducteeType" "TdsDeducteeType" NOT NULL,
    "deducteeId" TEXT NOT NULL,
    "deductionDate" TIMESTAMP(3) NOT NULL,
    "grossAmount" DECIMAL(14,2) NOT NULL,
    "tdsAmount" DECIMAL(14,2) NOT NULL,
    "netAmount" DECIMAL(14,2) NOT NULL,
    "quarter" INTEGER NOT NULL,
    "voucherId" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paymentVoucherId" TEXT,
    "certificateId" TEXT,
    "organizationId" TEXT,
    "financialYearId" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tds_deductions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tds_certificates" (
    "id" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "deducteeType" "TdsDeducteeType" NOT NULL,
    "deducteeId" TEXT NOT NULL,
    "financialYearId" TEXT NOT NULL,
    "quarter" INTEGER NOT NULL,
    "totalGrossAmount" DECIMAL(14,2) NOT NULL,
    "totalTdsAmount" DECIMAL(14,2) NOT NULL,
    "status" "TdsCertificateStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedDate" TIMESTAMP(3),
    "issuedById" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tds_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "financialYearId" TEXT NOT NULL,
    "scope" "BudgetScope" NOT NULL DEFAULT 'ORGANIZATION',
    "scopeId" TEXT,
    "budgetType" "BudgetType" NOT NULL DEFAULT 'BOTH',
    "periodType" "BudgetPeriodType" NOT NULL DEFAULT 'MONTHLY',
    "status" "BudgetStatus" NOT NULL DEFAULT 'DRAFT',
    "totalBudgetedAmount" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_lines" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "ledgerId" TEXT NOT NULL,
    "periodMonth" INTEGER,
    "budgetedAmount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "year_end_closings" (
    "id" TEXT NOT NULL,
    "financialYearId" TEXT NOT NULL,
    "netProfitAmount" DECIMAL(16,2) NOT NULL,
    "retainedEarningsLedgerId" TEXT NOT NULL,
    "profitTransferVoucherId" TEXT,
    "openingBalancesGeneratedFor" TEXT,
    "openingBalanceLedgerCount" INTEGER NOT NULL DEFAULT 0,
    "closedById" TEXT,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "year_end_closings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_schedule_definitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reportKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "frequency" "ReportFrequency" NOT NULL,
    "format" "ReportFormat" NOT NULL DEFAULT 'PDF',
    "recipientEmails" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "report_schedule_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gst_registrations_gstin_key" ON "gst_registrations"("gstin");

-- CreateIndex
CREATE INDEX "gst_registrations_organizationId_idx" ON "gst_registrations"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "gst_adjustments_voucherId_key" ON "gst_adjustments"("voucherId");

-- CreateIndex
CREATE INDEX "gst_adjustments_gstRegistrationId_idx" ON "gst_adjustments"("gstRegistrationId");

-- CreateIndex
CREATE UNIQUE INDEX "gst_return_periods_gstRegistrationId_returnType_periodStart_key" ON "gst_return_periods"("gstRegistrationId", "returnType", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "tds_sections_sectionCode_key" ON "tds_sections"("sectionCode");

-- CreateIndex
CREATE UNIQUE INDEX "tds_deductions_voucherId_key" ON "tds_deductions"("voucherId");

-- CreateIndex
CREATE INDEX "tds_deductions_sectionId_idx" ON "tds_deductions"("sectionId");

-- CreateIndex
CREATE INDEX "tds_deductions_deducteeType_deducteeId_idx" ON "tds_deductions"("deducteeType", "deducteeId");

-- CreateIndex
CREATE UNIQUE INDEX "tds_certificates_certificateNumber_key" ON "tds_certificates"("certificateNumber");

-- CreateIndex
CREATE INDEX "budgets_financialYearId_idx" ON "budgets"("financialYearId");

-- CreateIndex
CREATE INDEX "budget_lines_budgetId_idx" ON "budget_lines"("budgetId");

-- CreateIndex
CREATE UNIQUE INDEX "budget_lines_budgetId_ledgerId_periodMonth_key" ON "budget_lines"("budgetId", "ledgerId", "periodMonth");

-- CreateIndex
CREATE UNIQUE INDEX "year_end_closings_financialYearId_key" ON "year_end_closings"("financialYearId");

-- CreateIndex
CREATE UNIQUE INDEX "year_end_closings_profitTransferVoucherId_key" ON "year_end_closings"("profitTransferVoucherId");

-- AddForeignKey
ALTER TABLE "gst_adjustments" ADD CONSTRAINT "gst_adjustments_gstRegistrationId_fkey" FOREIGN KEY ("gstRegistrationId") REFERENCES "gst_registrations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_adjustments" ADD CONSTRAINT "gst_adjustments_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_return_periods" ADD CONSTRAINT "gst_return_periods_gstRegistrationId_fkey" FOREIGN KEY ("gstRegistrationId") REFERENCES "gst_registrations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tds_deductions" ADD CONSTRAINT "tds_deductions_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "tds_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tds_deductions" ADD CONSTRAINT "tds_deductions_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tds_deductions" ADD CONSTRAINT "tds_deductions_paymentVoucherId_fkey" FOREIGN KEY ("paymentVoucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tds_deductions" ADD CONSTRAINT "tds_deductions_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "tds_certificates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "ledgers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "year_end_closings" ADD CONSTRAINT "year_end_closings_profitTransferVoucherId_fkey" FOREIGN KEY ("profitTransferVoucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

