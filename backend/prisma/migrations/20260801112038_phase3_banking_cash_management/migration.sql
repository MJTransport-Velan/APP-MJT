-- CreateEnum
CREATE TYPE "BankAccountType" AS ENUM ('SAVINGS', 'CURRENT', 'OD', 'CC', 'FIXED_DEPOSIT');

-- CreateEnum
CREATE TYPE "CashAccountType" AS ENUM ('MAIN', 'PETTY', 'BRANCH', 'SITE', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "PaymentModeType" AS ENUM ('CASH', 'CHEQUE', 'UPI', 'RTGS', 'NEFT', 'IMPS', 'BANK_TRANSFER', 'DD', 'CARD', 'WALLET', 'QR', 'CUSTOM');

-- CreateEnum
CREATE TYPE "FundAccountType" AS ENUM ('BANK', 'CASH');

-- CreateEnum
CREATE TYPE "ChequeDirection" AS ENUM ('ISSUED', 'RECEIVED');

-- CreateEnum
CREATE TYPE "ChequeStatus" AS ENUM ('AVAILABLE', 'ISSUED', 'RECEIVED', 'DEPOSITED', 'PRESENTED', 'CLEARED', 'RETURNED', 'BOUNCED', 'CANCELLED', 'STOP_PAYMENT', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PettyCashRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DISBURSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "BankReconciliationStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'LOCKED');

-- CreateEnum
CREATE TYPE "ReconciliationLineStatus" AS ENUM ('UNMATCHED', 'MATCHED', 'IGNORED', 'ADJUSTED');

-- CreateEnum
CREATE TYPE "BankStatementFileFormat" AS ENUM ('CSV', 'EXCEL', 'PDF', 'API', 'FEED');

-- CreateEnum
CREATE TYPE "BankStatementImportStatus" AS ENUM ('UPLOADED', 'PARSED', 'FAILED');

-- CreateEnum
CREATE TYPE "CashFlowCategory" AS ENUM ('OPERATING', 'INVESTING', 'FINANCING');

-- AlterEnum
ALTER TYPE "ApprovalModule" ADD VALUE 'PETTY_CASH_REQUEST';

-- AlterTable
ALTER TABLE "payment_modes" ADD COLUMN     "chargeApplicable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "defaultChargeLedgerId" TEXT,
ADD COLUMN     "isSystemMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "requiresBankAccount" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "requiresChequeDetails" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "type" "PaymentModeType" NOT NULL DEFAULT 'CUSTOM';

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ledgerId" TEXT NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountType" "BankAccountType" NOT NULL DEFAULT 'CURRENT',
    "ifscCode" TEXT,
    "micrCode" TEXT,
    "swiftCode" TEXT,
    "branchName" TEXT,
    "openingBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "openingDate" DATE,
    "chequeAwaitingClearanceLedgerId" TEXT NOT NULL,
    "chequeReceivedClearanceLedgerId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isDefaultPaymentAccount" BOOLEAN NOT NULL DEFAULT false,
    "isDefaultReceiptAccount" BOOLEAN NOT NULL DEFAULT false,
    "statementImportFormat" "BankStatementFileFormat",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_accounts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ledgerId" TEXT NOT NULL,
    "cashAccountType" "CashAccountType" NOT NULL DEFAULT 'PETTY',
    "responsiblePersonId" TEXT,
    "maximumLimit" DECIMAL(18,2),
    "approvalLimit" DECIMAL(18,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_transfers" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "transferDate" DATE NOT NULL,
    "fromAccountType" "FundAccountType" NOT NULL,
    "fromAccountId" TEXT NOT NULL,
    "toAccountType" "FundAccountType" NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "transferCharges" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "chargeLedgerId" TEXT,
    "paymentModeId" TEXT,
    "referenceNumber" TEXT,
    "narration" TEXT,
    "voucherId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cheque_books" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "bookNumber" TEXT NOT NULL,
    "startNumber" TEXT NOT NULL,
    "endNumber" TEXT NOT NULL,
    "totalLeaves" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cheque_books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cheques" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "chequeBookId" TEXT,
    "direction" "ChequeDirection" NOT NULL,
    "chequeNumber" TEXT NOT NULL,
    "chequeDate" DATE NOT NULL,
    "isPostDated" BOOLEAN NOT NULL DEFAULT false,
    "partyType" "LedgerPartyType" NOT NULL DEFAULT 'NONE',
    "partyId" TEXT,
    "payeeOrPayerName" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "status" "ChequeStatus" NOT NULL DEFAULT 'AVAILABLE',
    "voucherId" TEXT,
    "clearanceVoucherId" TEXT,
    "bounceReturnVoucherId" TEXT,
    "depositedIntoBankAccountId" TEXT,
    "depositDate" DATE,
    "clearanceDate" DATE,
    "bounceReason" TEXT,
    "bounceChargeVoucherId" TEXT,
    "stopPaymentReason" TEXT,
    "cancellationReason" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cheques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "petty_cash_requests" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cashAccountId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" "PettyCashRequestStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "disbursementTransferId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "petty_cash_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "petty_cash_request_approvals" (
    "id" TEXT NOT NULL,
    "pettyCashRequestId" TEXT NOT NULL,
    "approvalRuleId" TEXT,
    "levelNo" INTEGER NOT NULL,
    "approverRoleId" TEXT NOT NULL,
    "actualApproverId" TEXT,
    "decision" "VoucherApprovalDecision" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "petty_cash_request_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_reconciliations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "periodFrom" DATE NOT NULL,
    "periodTo" DATE NOT NULL,
    "statementOpeningBalance" DECIMAL(18,2) NOT NULL,
    "statementClosingBalance" DECIMAL(18,2) NOT NULL,
    "status" "BankReconciliationStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lockedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_reconciliation_lines" (
    "id" TEXT NOT NULL,
    "bankReconciliationId" TEXT NOT NULL,
    "lineDate" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "chequeNumber" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "side" "BalanceSide" NOT NULL,
    "matchedVoucherLineId" TEXT,
    "matchedChequeId" TEXT,
    "status" "ReconciliationLineStatus" NOT NULL DEFAULT 'UNMATCHED',
    "adjustmentVoucherId" TEXT,
    "sourceImportLineId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_reconciliation_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_statement_import_batches" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "fileFormat" "BankStatementFileFormat" NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "storedFileRef" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "status" "BankStatementImportStatus" NOT NULL DEFAULT 'UPLOADED',
    "errorLog" TEXT,
    "importedById" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_statement_import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_statement_import_lines" (
    "id" TEXT NOT NULL,
    "bankStatementImportBatchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "rawDate" TEXT NOT NULL,
    "parsedDate" DATE,
    "rawDescription" TEXT NOT NULL,
    "rawAmount" TEXT NOT NULL,
    "parsedAmount" DECIMAL(18,2),
    "parsedSide" "BalanceSide",

    CONSTRAINT "bank_statement_import_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_flow_category_mappings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountGroupId" TEXT,
    "ledgerId" TEXT,
    "category" "CashFlowCategory" NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_flow_category_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_ledgerId_key" ON "bank_accounts"("ledgerId");

-- CreateIndex
CREATE INDEX "bank_accounts_organizationId_idx" ON "bank_accounts"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_organizationId_accountNumber_key" ON "bank_accounts"("organizationId", "accountNumber");

-- CreateIndex
CREATE UNIQUE INDEX "cash_accounts_ledgerId_key" ON "cash_accounts"("ledgerId");

-- CreateIndex
CREATE INDEX "cash_accounts_organizationId_idx" ON "cash_accounts"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "cash_accounts_organizationId_ledgerId_key" ON "cash_accounts"("organizationId", "ledgerId");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transfers_voucherId_key" ON "bank_transfers"("voucherId");

-- CreateIndex
CREATE INDEX "bank_transfers_fromAccountType_fromAccountId_idx" ON "bank_transfers"("fromAccountType", "fromAccountId");

-- CreateIndex
CREATE INDEX "bank_transfers_toAccountType_toAccountId_idx" ON "bank_transfers"("toAccountType", "toAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transfers_organizationId_transferNumber_key" ON "bank_transfers"("organizationId", "transferNumber");

-- CreateIndex
CREATE UNIQUE INDEX "cheque_books_bankAccountId_bookNumber_key" ON "cheque_books"("bankAccountId", "bookNumber");

-- CreateIndex
CREATE INDEX "cheques_status_idx" ON "cheques"("status");

-- CreateIndex
CREATE INDEX "cheques_partyType_partyId_idx" ON "cheques"("partyType", "partyId");

-- CreateIndex
CREATE INDEX "cheques_chequeDate_idx" ON "cheques"("chequeDate");

-- CreateIndex
CREATE UNIQUE INDEX "cheques_bankAccountId_chequeNumber_direction_key" ON "cheques"("bankAccountId", "chequeNumber", "direction");

-- CreateIndex
CREATE INDEX "petty_cash_requests_organizationId_status_idx" ON "petty_cash_requests"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "petty_cash_request_approvals_pettyCashRequestId_levelNo_key" ON "petty_cash_request_approvals"("pettyCashRequestId", "levelNo");

-- CreateIndex
CREATE UNIQUE INDEX "bank_reconciliations_bankAccountId_periodFrom_periodTo_key" ON "bank_reconciliations"("bankAccountId", "periodFrom", "periodTo");

-- CreateIndex
CREATE UNIQUE INDEX "bank_reconciliation_lines_sourceImportLineId_key" ON "bank_reconciliation_lines"("sourceImportLineId");

-- CreateIndex
CREATE INDEX "bank_reconciliation_lines_bankReconciliationId_status_idx" ON "bank_reconciliation_lines"("bankReconciliationId", "status");

-- CreateIndex
CREATE INDEX "bank_statement_import_batches_bankAccountId_idx" ON "bank_statement_import_batches"("bankAccountId");

-- CreateIndex
CREATE INDEX "bank_statement_import_lines_bankStatementImportBatchId_idx" ON "bank_statement_import_lines"("bankStatementImportBatchId");

-- AddForeignKey
ALTER TABLE "payment_modes" ADD CONSTRAINT "payment_modes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_modes" ADD CONSTRAINT "payment_modes_defaultChargeLedgerId_fkey" FOREIGN KEY ("defaultChargeLedgerId") REFERENCES "ledgers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "ledgers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_chequeAwaitingClearanceLedgerId_fkey" FOREIGN KEY ("chequeAwaitingClearanceLedgerId") REFERENCES "ledgers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_chequeReceivedClearanceLedgerId_fkey" FOREIGN KEY ("chequeReceivedClearanceLedgerId") REFERENCES "ledgers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_accounts" ADD CONSTRAINT "cash_accounts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_accounts" ADD CONSTRAINT "cash_accounts_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "ledgers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transfers" ADD CONSTRAINT "bank_transfers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transfers" ADD CONSTRAINT "bank_transfers_chargeLedgerId_fkey" FOREIGN KEY ("chargeLedgerId") REFERENCES "ledgers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transfers" ADD CONSTRAINT "bank_transfers_paymentModeId_fkey" FOREIGN KEY ("paymentModeId") REFERENCES "payment_modes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transfers" ADD CONSTRAINT "bank_transfers_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheque_books" ADD CONSTRAINT "cheque_books_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheque_books" ADD CONSTRAINT "cheque_books_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheques" ADD CONSTRAINT "cheques_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheques" ADD CONSTRAINT "cheques_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheques" ADD CONSTRAINT "cheques_chequeBookId_fkey" FOREIGN KEY ("chequeBookId") REFERENCES "cheque_books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheques" ADD CONSTRAINT "cheques_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheques" ADD CONSTRAINT "cheques_clearanceVoucherId_fkey" FOREIGN KEY ("clearanceVoucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheques" ADD CONSTRAINT "cheques_bounceReturnVoucherId_fkey" FOREIGN KEY ("bounceReturnVoucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheques" ADD CONSTRAINT "cheques_bounceChargeVoucherId_fkey" FOREIGN KEY ("bounceChargeVoucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheques" ADD CONSTRAINT "cheques_depositedIntoBankAccountId_fkey" FOREIGN KEY ("depositedIntoBankAccountId") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_requests" ADD CONSTRAINT "petty_cash_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_requests" ADD CONSTRAINT "petty_cash_requests_cashAccountId_fkey" FOREIGN KEY ("cashAccountId") REFERENCES "cash_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_requests" ADD CONSTRAINT "petty_cash_requests_disbursementTransferId_fkey" FOREIGN KEY ("disbursementTransferId") REFERENCES "bank_transfers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_request_approvals" ADD CONSTRAINT "petty_cash_request_approvals_pettyCashRequestId_fkey" FOREIGN KEY ("pettyCashRequestId") REFERENCES "petty_cash_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_request_approvals" ADD CONSTRAINT "petty_cash_request_approvals_approvalRuleId_fkey" FOREIGN KEY ("approvalRuleId") REFERENCES "approval_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_reconciliation_lines" ADD CONSTRAINT "bank_reconciliation_lines_bankReconciliationId_fkey" FOREIGN KEY ("bankReconciliationId") REFERENCES "bank_reconciliations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_reconciliation_lines" ADD CONSTRAINT "bank_reconciliation_lines_matchedVoucherLineId_fkey" FOREIGN KEY ("matchedVoucherLineId") REFERENCES "voucher_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_reconciliation_lines" ADD CONSTRAINT "bank_reconciliation_lines_matchedChequeId_fkey" FOREIGN KEY ("matchedChequeId") REFERENCES "cheques"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_reconciliation_lines" ADD CONSTRAINT "bank_reconciliation_lines_adjustmentVoucherId_fkey" FOREIGN KEY ("adjustmentVoucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_reconciliation_lines" ADD CONSTRAINT "bank_reconciliation_lines_sourceImportLineId_fkey" FOREIGN KEY ("sourceImportLineId") REFERENCES "bank_statement_import_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_statement_import_batches" ADD CONSTRAINT "bank_statement_import_batches_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_statement_import_batches" ADD CONSTRAINT "bank_statement_import_batches_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_statement_import_lines" ADD CONSTRAINT "bank_statement_import_lines_bankStatementImportBatchId_fkey" FOREIGN KEY ("bankStatementImportBatchId") REFERENCES "bank_statement_import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_flow_category_mappings" ADD CONSTRAINT "cash_flow_category_mappings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_flow_category_mappings" ADD CONSTRAINT "cash_flow_category_mappings_accountGroupId_fkey" FOREIGN KEY ("accountGroupId") REFERENCES "account_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_flow_category_mappings" ADD CONSTRAINT "cash_flow_category_mappings_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "ledgers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
