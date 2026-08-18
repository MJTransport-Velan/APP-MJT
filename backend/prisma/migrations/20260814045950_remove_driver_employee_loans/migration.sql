-- DropForeignKey
ALTER TABLE "party_loan_installments" DROP CONSTRAINT "party_loan_installments_loanId_fkey";

-- DropTable
DROP TABLE "party_loan_installments";

-- DropTable
DROP TABLE "party_loans";

-- DropEnum
DROP TYPE "LoanBorrowerType";

-- DropEnum
DROP TYPE "PartyLoanType";

-- DropEnum
DROP TYPE "LoanStatus";

-- DropEnum
DROP TYPE "LoanInstallmentStatus";

-- AlterEnum (remove LOAN_INSTALLMENT from SettlementLineSourceType)
BEGIN;
CREATE TYPE "SettlementLineSourceType_new" AS ENUM ('ADVANCE', 'ALLOWANCE', 'INCENTIVE', 'REIMBURSEMENT', 'PENALTY', 'SALARY');
ALTER TABLE "driver_settlement_lines" ALTER COLUMN "sourceType" TYPE "SettlementLineSourceType_new" USING ("sourceType"::text::"SettlementLineSourceType_new");
ALTER TYPE "SettlementLineSourceType" RENAME TO "SettlementLineSourceType_old";
ALTER TYPE "SettlementLineSourceType_new" RENAME TO "SettlementLineSourceType";
DROP TYPE "SettlementLineSourceType_old";
COMMIT;
