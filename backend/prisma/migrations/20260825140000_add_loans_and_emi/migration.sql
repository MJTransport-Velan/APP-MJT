-- Phase 17 — Loans & EMI.
--
-- One generic Loan replaces the vehicle-only VehicleLoan model that was
-- dropped earlier: it covers Vehicle / Bank / Business / Owner / Other
-- loans, which differ only in which master they point at, never in their
-- EMI mechanics.
--
-- Additive only — no existing table is altered and no data is touched.

CREATE TYPE "LoanType" AS ENUM ('VEHICLE_LOAN', 'BANK_LOAN', 'BUSINESS_LOAN', 'OWNER_LOAN', 'OTHER_LOAN');
CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'CLOSED', 'FORECLOSED');
CREATE TYPE "LoanInstallmentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'WAIVED');

CREATE TABLE "loans" (
    "id" TEXT NOT NULL,
    "loanNumber" TEXT NOT NULL,
    "loanName" TEXT NOT NULL,
    "lenderName" TEXT NOT NULL,
    "loanType" "LoanType" NOT NULL,
    "vehicleId" TEXT,
    "fixedAssetId" TEXT,
    "capitalPartnerId" TEXT,
    "loanStartDate" TIMESTAMP(3) NOT NULL,
    "principalAmount" DECIMAL(14,2) NOT NULL,
    "interestRatePercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tenureMonths" INTEGER NOT NULL,
    "emiAmount" DECIMAL(14,2) NOT NULL,
    "firstEmiDate" TIMESTAMP(3) NOT NULL,
    "fundAccountType" "FundAccountType" NOT NULL,
    "fundAccountId" TEXT NOT NULL,
    "loanAccountRef" TEXT,
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "remarks" TEXT,
    "organizationId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "loans_loanNumber_key" ON "loans"("loanNumber");
CREATE INDEX "loans_loanType_idx" ON "loans"("loanType");
CREATE INDEX "loans_vehicleId_idx" ON "loans"("vehicleId");
CREATE INDEX "loans_status_idx" ON "loans"("status");

CREATE TABLE "loan_installments" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "installmentNo" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "emiAmount" DECIMAL(14,2) NOT NULL,
    "principalComponent" DECIMAL(14,2) NOT NULL,
    "interestComponent" DECIMAL(14,2) NOT NULL,
    "status" "LoanInstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "paidDate" TIMESTAMP(3),
    "paidAmount" DECIMAL(14,2),
    "fundAccountType" "FundAccountType",
    "fundAccountId" TEXT,
    "paymentModeId" TEXT,
    "referenceNumber" TEXT,
    "remarks" TEXT,
    "financialEntryId" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_installments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "loan_installments_loanId_installmentNo_key" ON "loan_installments"("loanId", "installmentNo");
CREATE INDEX "loan_installments_loanId_idx" ON "loan_installments"("loanId");
CREATE INDEX "loan_installments_dueDate_idx" ON "loan_installments"("dueDate");
CREATE INDEX "loan_installments_status_idx" ON "loan_installments"("status");

ALTER TABLE "loans" ADD CONSTRAINT "loans_vehicleId_fkey"
    FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "loans" ADD CONSTRAINT "loans_fixedAssetId_fkey"
    FOREIGN KEY ("fixedAssetId") REFERENCES "fixed_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "loans" ADD CONSTRAINT "loans_capitalPartnerId_fkey"
    FOREIGN KEY ("capitalPartnerId") REFERENCES "capital_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "loan_installments" ADD CONSTRAINT "loan_installments_loanId_fkey"
    FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "loan_installments" ADD CONSTRAINT "loan_installments_paymentModeId_fkey"
    FOREIGN KEY ("paymentModeId") REFERENCES "payment_modes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Permissions for the new module. role_permissions cascades on delete, and
-- the seed grants these to the finance roles.
INSERT INTO "permissions" ("id", "name", "description", "createdAt")
SELECT gen_random_uuid(), v.name, v.description, NOW()
FROM (VALUES
    ('loan.view',        'View Loans & EMI schedules'),
    ('loan.create',      'Create a Loan (generates its EMI schedule)'),
    ('loan.edit',        'Edit a Loan / close or foreclose it'),
    ('loan.delete',      'Delete a Loan that has no paid EMI'),
    ('loan_emi.pay',     'Pay a Loan EMI installment'),
    ('loan_emi.reverse', 'Reverse a paid Loan EMI installment')
) AS v(name, description)
WHERE NOT EXISTS (SELECT 1 FROM "permissions" p WHERE p."name" = v.name);
