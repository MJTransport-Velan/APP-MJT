-- CreateEnum
CREATE TYPE "LoanBorrowerType" AS ENUM ('DRIVER', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "PartyLoanType" AS ENUM ('PERSONAL', 'EMERGENCY', 'VEHICLE', 'FESTIVAL', 'MEDICAL');

-- DropForeignKey
ALTER TABLE "driver_loan_installments" DROP CONSTRAINT "driver_loan_installments_loanId_fkey";

-- DropForeignKey
ALTER TABLE "driver_loan_installments" DROP CONSTRAINT "driver_loan_installments_recoveredSettlementId_fkey";

-- DropForeignKey
ALTER TABLE "driver_loans" DROP CONSTRAINT "driver_loans_disbursementVoucherId_fkey";

-- DropForeignKey
ALTER TABLE "driver_loans" DROP CONSTRAINT "driver_loans_driverId_fkey";

-- DropForeignKey
ALTER TABLE "driver_loans" DROP CONSTRAINT "driver_loans_driverLedgerId_fkey";

-- DropForeignKey
ALTER TABLE "employee_loan_installments" DROP CONSTRAINT "employee_loan_installments_loanId_fkey";

-- DropForeignKey
ALTER TABLE "employee_loan_installments" DROP CONSTRAINT "employee_loan_installments_recoveredInPayrollRunLineId_fkey";

-- DropForeignKey
ALTER TABLE "employee_loans" DROP CONSTRAINT "employee_loans_disbursementVoucherId_fkey";

-- DropForeignKey
ALTER TABLE "employee_loans" DROP CONSTRAINT "employee_loans_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "employee_loans" DROP CONSTRAINT "employee_loans_employeeLedgerId_fkey";

-- DropTable
DROP TABLE "driver_loan_installments";

-- DropTable
DROP TABLE "driver_loans";

-- DropTable
DROP TABLE "employee_loan_installments";

-- DropTable
DROP TABLE "employee_loans";

-- DropEnum
DROP TYPE "DriverLoanType";

-- DropEnum
DROP TYPE "EmployeeLoanType";

-- CreateTable
CREATE TABLE "party_loans" (
    "id" TEXT NOT NULL,
    "loanNumber" TEXT NOT NULL,
    "borrowerType" "LoanBorrowerType" NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "loanType" "PartyLoanType" NOT NULL,
    "principalAmount" DECIMAL(12,2) NOT NULL,
    "tenureMonths" INTEGER NOT NULL,
    "emiAmount" DECIMAL(12,2) NOT NULL,
    "interestRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "approvedById" TEXT,
    "status" "LoanStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "borrowerLedgerId" TEXT,
    "disbursementVoucherId" TEXT,
    "organizationId" TEXT,
    "financialYearId" TEXT,
    "accountingPeriodId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "party_loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "party_loan_installments" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "installmentNo" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "emiAmount" DECIMAL(12,2) NOT NULL,
    "status" "LoanInstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "recoveredReferenceType" TEXT,
    "recoveredReferenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "party_loan_installments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "party_loans_loanNumber_key" ON "party_loans"("loanNumber");

-- CreateIndex
CREATE UNIQUE INDEX "party_loans_disbursementVoucherId_key" ON "party_loans"("disbursementVoucherId");

-- CreateIndex
CREATE INDEX "party_loans_borrowerType_borrowerId_idx" ON "party_loans"("borrowerType", "borrowerId");

-- CreateIndex
CREATE INDEX "party_loan_installments_loanId_idx" ON "party_loan_installments"("loanId");

-- CreateIndex
CREATE INDEX "party_loan_installments_recoveredReferenceType_recoveredRef_idx" ON "party_loan_installments"("recoveredReferenceType", "recoveredReferenceId");

-- AddForeignKey
ALTER TABLE "party_loan_installments" ADD CONSTRAINT "party_loan_installments_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "party_loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

