-- AlterTable
ALTER TABLE "trips" DROP COLUMN "settlementReference",
DROP COLUMN "settlementStatus",
DROP COLUMN "supplierCommission";

-- DropEnum
DROP TYPE "SettlementStatus";

