-- DropForeignKey
ALTER TABLE "driver_expense_reimbursements" DROP CONSTRAINT "driver_expense_reimbursements_driverId_fkey";
ALTER TABLE "driver_expense_reimbursements" DROP CONSTRAINT "driver_expense_reimbursements_settlementId_fkey";
ALTER TABLE "driver_expense_reimbursements" DROP CONSTRAINT "driver_expense_reimbursements_tripId_fkey";
ALTER TABLE "driver_expense_reimbursements" DROP CONSTRAINT "driver_expense_reimbursements_vehicleId_fkey";

-- DropTable
DROP TABLE "driver_expense_reimbursements";

-- DropEnum
DROP TYPE "DriverExpenseCategory";

-- AlterEnum (remove REIMBURSEMENT from SettlementLineSourceType)
BEGIN;
CREATE TYPE "SettlementLineSourceType_new" AS ENUM ('ADVANCE', 'ALLOWANCE', 'INCENTIVE', 'PENALTY', 'SALARY');
ALTER TABLE "driver_settlement_lines" ALTER COLUMN "sourceType" TYPE "SettlementLineSourceType_new" USING ("sourceType"::text::"SettlementLineSourceType_new");
ALTER TYPE "SettlementLineSourceType" RENAME TO "SettlementLineSourceType_old";
ALTER TYPE "SettlementLineSourceType_new" RENAME TO "SettlementLineSourceType";
DROP TYPE "SettlementLineSourceType_old";
COMMIT;
