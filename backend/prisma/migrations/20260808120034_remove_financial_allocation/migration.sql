-- DropForeignKey
ALTER TABLE "financial_allocations" DROP CONSTRAINT "financial_allocations_financialEntryId_fkey";

-- AlterTable
ALTER TABLE "financial_entries" DROP COLUMN "allocatedAmount";

-- DropTable
DROP TABLE "financial_allocations";

