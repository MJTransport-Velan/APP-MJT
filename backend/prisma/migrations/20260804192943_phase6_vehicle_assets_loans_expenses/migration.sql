-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('VEHICLE', 'LAND', 'BUILDING', 'FURNITURE', 'COMPUTER', 'MACHINERY', 'OFFICE_EQUIPMENT', 'WAREHOUSE_EQUIPMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "DepreciationMethod" AS ENUM ('STRAIGHT_LINE', 'WRITTEN_DOWN_VALUE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "FixedAssetStatus" AS ENUM ('ACTIVE', 'UNDER_TRANSFER', 'DISPOSED', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "LenderType" AS ENUM ('BANK', 'NBFC', 'PRIVATE_FINANCE', 'INTERNAL');

-- CreateEnum
CREATE TYPE "VehicleLoanStatus" AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'CLOSED', 'FORECLOSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VehicleLoanInstallmentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'WAIVED');

-- CreateEnum
CREATE TYPE "DepreciationRunStatus" AS ENUM ('DRAFT', 'CALCULATED', 'APPROVED');

-- CreateEnum
CREATE TYPE "DepreciationPeriodType" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "ComplianceType" AS ENUM ('INSURANCE', 'PERMIT', 'FITNESS', 'ROAD_TAX', 'POLLUTION');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'RENEWED');

-- CreateEnum
CREATE TYPE "InsuranceClaimStatus" AS ENUM ('FILED', 'APPROVED', 'SETTLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FastTagTransactionType" AS ENUM ('RECHARGE', 'USAGE');

-- CreateEnum
CREATE TYPE "VehicleTyreStatus" AS ENUM ('INSTALLED', 'REMOVED', 'SCRAPPED');

-- CreateEnum
CREATE TYPE "TyreMovementType" AS ENUM ('INSTALL', 'ROTATE', 'REMOVE', 'SCRAP');

-- CreateEnum
CREATE TYPE "VehicleBatteryStatus" AS ENUM ('INSTALLED', 'REPLACED', 'DISPOSED');

-- CreateEnum
CREATE TYPE "AssetTransferType" AS ENUM ('DEPARTMENT', 'CUSTODY', 'LOCATION');

-- CreateEnum
CREATE TYPE "AssetDisposalType" AS ENUM ('SALE', 'SCRAP', 'WRITE_OFF', 'THEFT', 'ACCIDENT_TOTAL_LOSS', 'DONATION');

-- AlterEnum
ALTER TYPE "VehicleExpenseCategory" ADD VALUE 'REPAIR';
ALTER TYPE "VehicleExpenseCategory" ADD VALUE 'SERVICE';
ALTER TYPE "VehicleExpenseCategory" ADD VALUE 'TYRE';
ALTER TYPE "VehicleExpenseCategory" ADD VALUE 'BATTERY';
ALTER TYPE "VehicleExpenseCategory" ADD VALUE 'FITNESS';
ALTER TYPE "VehicleExpenseCategory" ADD VALUE 'ROAD_TAX';
ALTER TYPE "VehicleExpenseCategory" ADD VALUE 'FASTTAG';
ALTER TYPE "VehicleExpenseCategory" ADD VALUE 'ACCESSORIES';
ALTER TYPE "VehicleExpenseCategory" ADD VALUE 'GREASE_LUBRICANTS';
ALTER TYPE "VehicleExpenseCategory" ADD VALUE 'BREAKDOWN';

-- AlterTable
ALTER TABLE "vehicle_expenses" ADD COLUMN     "accountingPeriodId" TEXT,
ADD COLUMN     "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "expenseLedgerId" TEXT,
ADD COLUMN     "financialYearId" TEXT,
ADD COLUMN     "gstMasterId" TEXT,
ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "supplierId" TEXT,
ADD COLUMN     "taxAmount" DECIMAL(12,2),
ADD COLUMN     "totalAmount" DECIMAL(12,2),
ADD COLUMN     "tripId" TEXT,
ADD COLUMN     "voucherId" TEXT;

-- CreateTable
CREATE TABLE "asset_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetType" "AssetType" NOT NULL,
    "usefulLifeMonths" INTEGER NOT NULL,
    "depreciationMethod" "DepreciationMethod" NOT NULL DEFAULT 'STRAIGHT_LINE',
    "depreciationRatePercent" DECIMAL(5,2),
    "residualValuePercent" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "assetLedgerId" TEXT,
    "depreciationExpenseLedgerId" TEXT,
    "accumulatedDepreciationLedgerId" TEXT,
    "isSystemCategory" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixed_assets" (
    "id" TEXT NOT NULL,
    "assetCode" TEXT NOT NULL,
    "assetName" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "supplierId" TEXT,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "capitalizationDate" TIMESTAMP(3) NOT NULL,
    "purchaseValue" DECIMAL(14,2) NOT NULL,
    "residualValue" DECIMAL(14,2) NOT NULL,
    "usefulLifeMonths" INTEGER NOT NULL,
    "depreciationMethod" "DepreciationMethod" NOT NULL,
    "currentValue" DECIMAL(14,2) NOT NULL,
    "departmentId" TEXT,
    "locationText" TEXT,
    "responsiblePersonId" TEXT,
    "status" "FixedAssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "purchaseVoucherId" TEXT,
    "organizationId" TEXT,
    "financialYearId" TEXT,
    "accountingPeriodId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fixed_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_loans" (
    "id" TEXT NOT NULL,
    "loanNumber" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "fixedAssetId" TEXT,
    "lenderType" "LenderType" NOT NULL,
    "lenderName" TEXT NOT NULL,
    "loanAccountNumber" TEXT,
    "principalAmount" DECIMAL(14,2) NOT NULL,
    "processingFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "interestRatePercent" DECIMAL(5,2) NOT NULL,
    "disbursementDate" TIMESTAMP(3) NOT NULL,
    "emiStartDate" TIMESTAMP(3) NOT NULL,
    "emiAmount" DECIMAL(12,2) NOT NULL,
    "tenureMonths" INTEGER NOT NULL,
    "status" "VehicleLoanStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "loanLedgerId" TEXT,
    "approvedById" TEXT,
    "organizationId" TEXT,
    "financialYearId" TEXT,
    "accountingPeriodId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_loan_disbursements" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "disbursementDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "voucherId" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_loan_disbursements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_loan_installments" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "installmentNo" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "emiAmount" DECIMAL(12,2) NOT NULL,
    "principalComponent" DECIMAL(12,2) NOT NULL,
    "interestComponent" DECIMAL(12,2) NOT NULL,
    "lateFeeAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "VehicleLoanInstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "paidVoucherId" TEXT,
    "paidDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_loan_installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "depreciation_runs" (
    "id" TEXT NOT NULL,
    "runNumber" TEXT NOT NULL,
    "periodType" "DepreciationPeriodType" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "DepreciationRunStatus" NOT NULL DEFAULT 'DRAFT',
    "journalVoucherId" TEXT,
    "approvedById" TEXT,
    "organizationId" TEXT,
    "financialYearId" TEXT,
    "accountingPeriodId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "depreciation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "depreciation_run_lines" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "openingValue" DECIMAL(14,2) NOT NULL,
    "depreciationAmount" DECIMAL(12,2) NOT NULL,
    "closingValue" DECIMAL(14,2) NOT NULL,
    "method" "DepreciationMethod" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "depreciation_run_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_compliance_records" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "complianceType" "ComplianceType" NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "issuerName" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "premiumOrFeeAmount" DECIMAL(12,2),
    "documentUrl" TEXT,
    "renewedFromId" TEXT,
    "voucherId" TEXT,
    "status" "ComplianceStatus" NOT NULL DEFAULT 'ACTIVE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_compliance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_insurance_claims" (
    "id" TEXT NOT NULL,
    "complianceRecordId" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "claimDate" TIMESTAMP(3) NOT NULL,
    "claimAmount" DECIMAL(12,2) NOT NULL,
    "settledAmount" DECIMAL(12,2),
    "settlementDate" TIMESTAMP(3),
    "status" "InsuranceClaimStatus" NOT NULL DEFAULT 'FILED',
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_insurance_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fasttag_accounts" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "fastagNumber" TEXT,
    "currentBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ledgerId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fasttag_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fasttag_transactions" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" "FastTagTransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "tripId" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voucherId" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fasttag_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_tyres" (
    "id" TEXT NOT NULL,
    "tyreId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "serialNumber" TEXT,
    "position" TEXT,
    "installedDate" TIMESTAMP(3),
    "installedOdometer" INTEGER,
    "removedDate" TIMESTAMP(3),
    "removedOdometer" INTEGER,
    "status" "VehicleTyreStatus" NOT NULL DEFAULT 'INSTALLED',
    "purchaseVoucherId" TEXT,
    "cost" DECIMAL(12,2),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_tyres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tyre_movements" (
    "id" TEXT NOT NULL,
    "vehicleTyreId" TEXT NOT NULL,
    "movementType" "TyreMovementType" NOT NULL,
    "fromVehicleId" TEXT,
    "toVehicleId" TEXT,
    "fromPosition" TEXT,
    "toPosition" TEXT,
    "odometerReading" INTEGER,
    "movementDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tyre_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_batteries" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "serialNumber" TEXT,
    "installedDate" TIMESTAMP(3) NOT NULL,
    "installedOdometer" INTEGER,
    "warrantyMonths" INTEGER,
    "warrantyExpiryDate" TIMESTAMP(3),
    "replacedDate" TIMESTAMP(3),
    "status" "VehicleBatteryStatus" NOT NULL DEFAULT 'INSTALLED',
    "purchaseVoucherId" TEXT,
    "cost" DECIMAL(12,2),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_batteries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_transfers" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "transferType" "AssetTransferType" NOT NULL,
    "fromDepartmentId" TEXT,
    "toDepartmentId" TEXT,
    "fromResponsiblePersonId" TEXT,
    "toResponsiblePersonId" TEXT,
    "transferDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_disposals" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "disposalType" "AssetDisposalType" NOT NULL,
    "disposalDate" TIMESTAMP(3) NOT NULL,
    "saleValue" DECIMAL(14,2),
    "netBookValueAtDisposal" DECIMAL(14,2) NOT NULL,
    "gainLossAmount" DECIMAL(14,2) NOT NULL,
    "buyerDetails" TEXT,
    "insuranceClaimId" TEXT,
    "voucherId" TEXT,
    "exchangeGroupId" TEXT,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "organizationId" TEXT,
    "financialYearId" TEXT,
    "accountingPeriodId" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_disposals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "asset_categories_code_key" ON "asset_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "fixed_assets_assetCode_key" ON "fixed_assets"("assetCode");

-- CreateIndex
CREATE UNIQUE INDEX "fixed_assets_vehicleId_key" ON "fixed_assets"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "fixed_assets_purchaseVoucherId_key" ON "fixed_assets"("purchaseVoucherId");

-- CreateIndex
CREATE INDEX "fixed_assets_categoryId_idx" ON "fixed_assets"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_loans_loanNumber_key" ON "vehicle_loans"("loanNumber");

-- CreateIndex
CREATE INDEX "vehicle_loans_vehicleId_idx" ON "vehicle_loans"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_loan_disbursements_voucherId_key" ON "vehicle_loan_disbursements"("voucherId");

-- CreateIndex
CREATE INDEX "vehicle_loan_disbursements_loanId_idx" ON "vehicle_loan_disbursements"("loanId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_loan_installments_paidVoucherId_key" ON "vehicle_loan_installments"("paidVoucherId");

-- CreateIndex
CREATE INDEX "vehicle_loan_installments_loanId_idx" ON "vehicle_loan_installments"("loanId");

-- CreateIndex
CREATE UNIQUE INDEX "depreciation_runs_runNumber_key" ON "depreciation_runs"("runNumber");

-- CreateIndex
CREATE UNIQUE INDEX "depreciation_runs_journalVoucherId_key" ON "depreciation_runs"("journalVoucherId");

-- CreateIndex
CREATE INDEX "depreciation_run_lines_runId_idx" ON "depreciation_run_lines"("runId");

-- CreateIndex
CREATE INDEX "depreciation_run_lines_assetId_idx" ON "depreciation_run_lines"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_compliance_records_renewedFromId_key" ON "vehicle_compliance_records"("renewedFromId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_compliance_records_voucherId_key" ON "vehicle_compliance_records"("voucherId");

-- CreateIndex
CREATE INDEX "vehicle_compliance_records_vehicleId_idx" ON "vehicle_compliance_records"("vehicleId");

-- CreateIndex
CREATE INDEX "vehicle_compliance_records_complianceType_idx" ON "vehicle_compliance_records"("complianceType");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_insurance_claims_claimNumber_key" ON "vehicle_insurance_claims"("claimNumber");

-- CreateIndex
CREATE INDEX "vehicle_insurance_claims_complianceRecordId_idx" ON "vehicle_insurance_claims"("complianceRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "fasttag_accounts_vehicleId_key" ON "fasttag_accounts"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "fasttag_transactions_voucherId_key" ON "fasttag_transactions"("voucherId");

-- CreateIndex
CREATE INDEX "fasttag_transactions_accountId_idx" ON "fasttag_transactions"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_tyres_purchaseVoucherId_key" ON "vehicle_tyres"("purchaseVoucherId");

-- CreateIndex
CREATE INDEX "vehicle_tyres_vehicleId_idx" ON "vehicle_tyres"("vehicleId");

-- CreateIndex
CREATE INDEX "tyre_movements_vehicleTyreId_idx" ON "tyre_movements"("vehicleTyreId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_batteries_purchaseVoucherId_key" ON "vehicle_batteries"("purchaseVoucherId");

-- CreateIndex
CREATE INDEX "vehicle_batteries_vehicleId_idx" ON "vehicle_batteries"("vehicleId");

-- CreateIndex
CREATE INDEX "asset_transfers_assetId_idx" ON "asset_transfers"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "asset_disposals_assetId_key" ON "asset_disposals"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "asset_disposals_insuranceClaimId_key" ON "asset_disposals"("insuranceClaimId");

-- CreateIndex
CREATE UNIQUE INDEX "asset_disposals_voucherId_key" ON "asset_disposals"("voucherId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_expenses_voucherId_key" ON "vehicle_expenses"("voucherId");

-- AddForeignKey
ALTER TABLE "vehicle_expenses" ADD CONSTRAINT "vehicle_expenses_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_expenses" ADD CONSTRAINT "vehicle_expenses_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_expenses" ADD CONSTRAINT "vehicle_expenses_gstMasterId_fkey" FOREIGN KEY ("gstMasterId") REFERENCES "gst_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_expenses" ADD CONSTRAINT "vehicle_expenses_expenseLedgerId_fkey" FOREIGN KEY ("expenseLedgerId") REFERENCES "ledgers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_expenses" ADD CONSTRAINT "vehicle_expenses_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_categories" ADD CONSTRAINT "asset_categories_assetLedgerId_fkey" FOREIGN KEY ("assetLedgerId") REFERENCES "ledgers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_categories" ADD CONSTRAINT "asset_categories_depreciationExpenseLedgerId_fkey" FOREIGN KEY ("depreciationExpenseLedgerId") REFERENCES "ledgers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_categories" ADD CONSTRAINT "asset_categories_accumulatedDepreciationLedgerId_fkey" FOREIGN KEY ("accumulatedDepreciationLedgerId") REFERENCES "ledgers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "asset_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_purchaseVoucherId_fkey" FOREIGN KEY ("purchaseVoucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_loans" ADD CONSTRAINT "vehicle_loans_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_loans" ADD CONSTRAINT "vehicle_loans_fixedAssetId_fkey" FOREIGN KEY ("fixedAssetId") REFERENCES "fixed_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_loans" ADD CONSTRAINT "vehicle_loans_loanLedgerId_fkey" FOREIGN KEY ("loanLedgerId") REFERENCES "ledgers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_loan_disbursements" ADD CONSTRAINT "vehicle_loan_disbursements_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "vehicle_loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_loan_disbursements" ADD CONSTRAINT "vehicle_loan_disbursements_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_loan_installments" ADD CONSTRAINT "vehicle_loan_installments_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "vehicle_loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_loan_installments" ADD CONSTRAINT "vehicle_loan_installments_paidVoucherId_fkey" FOREIGN KEY ("paidVoucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depreciation_runs" ADD CONSTRAINT "depreciation_runs_journalVoucherId_fkey" FOREIGN KEY ("journalVoucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depreciation_run_lines" ADD CONSTRAINT "depreciation_run_lines_runId_fkey" FOREIGN KEY ("runId") REFERENCES "depreciation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depreciation_run_lines" ADD CONSTRAINT "depreciation_run_lines_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "fixed_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_compliance_records" ADD CONSTRAINT "vehicle_compliance_records_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_compliance_records" ADD CONSTRAINT "vehicle_compliance_records_renewedFromId_fkey" FOREIGN KEY ("renewedFromId") REFERENCES "vehicle_compliance_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_compliance_records" ADD CONSTRAINT "vehicle_compliance_records_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_insurance_claims" ADD CONSTRAINT "vehicle_insurance_claims_complianceRecordId_fkey" FOREIGN KEY ("complianceRecordId") REFERENCES "vehicle_compliance_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fasttag_accounts" ADD CONSTRAINT "fasttag_accounts_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fasttag_accounts" ADD CONSTRAINT "fasttag_accounts_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "ledgers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fasttag_transactions" ADD CONSTRAINT "fasttag_transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "fasttag_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fasttag_transactions" ADD CONSTRAINT "fasttag_transactions_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fasttag_transactions" ADD CONSTRAINT "fasttag_transactions_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_tyres" ADD CONSTRAINT "vehicle_tyres_tyreId_fkey" FOREIGN KEY ("tyreId") REFERENCES "tyres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_tyres" ADD CONSTRAINT "vehicle_tyres_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_tyres" ADD CONSTRAINT "vehicle_tyres_purchaseVoucherId_fkey" FOREIGN KEY ("purchaseVoucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tyre_movements" ADD CONSTRAINT "tyre_movements_vehicleTyreId_fkey" FOREIGN KEY ("vehicleTyreId") REFERENCES "vehicle_tyres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_batteries" ADD CONSTRAINT "vehicle_batteries_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_batteries" ADD CONSTRAINT "vehicle_batteries_purchaseVoucherId_fkey" FOREIGN KEY ("purchaseVoucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "fixed_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_fromDepartmentId_fkey" FOREIGN KEY ("fromDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_toDepartmentId_fkey" FOREIGN KEY ("toDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_disposals" ADD CONSTRAINT "asset_disposals_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "fixed_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_disposals" ADD CONSTRAINT "asset_disposals_insuranceClaimId_fkey" FOREIGN KEY ("insuranceClaimId") REFERENCES "vehicle_insurance_claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_disposals" ADD CONSTRAINT "asset_disposals_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
