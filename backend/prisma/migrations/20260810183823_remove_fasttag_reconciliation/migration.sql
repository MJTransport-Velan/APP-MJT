-- DropForeignKey
ALTER TABLE "fasttag_provider_transactions" DROP CONSTRAINT "fasttag_provider_transactions_importBatchId_fkey";

-- DropForeignKey
ALTER TABLE "fasttag_provider_transactions" DROP CONSTRAINT "fasttag_provider_transactions_matchedTransactionId_fkey";

-- DropForeignKey
ALTER TABLE "fasttag_provider_transactions" DROP CONSTRAINT "fasttag_provider_transactions_tripId_fkey";

-- DropForeignKey
ALTER TABLE "fasttag_provider_transactions" DROP CONSTRAINT "fasttag_provider_transactions_vehicleId_fkey";

-- DropTable
DROP TABLE "fasttag_provider_transactions";

-- DropEnum
DROP TYPE "FastTagMatchStatus";

-- DropEnum
DROP TYPE "FastTagStatementNature";

-- CreateIndex
CREATE INDEX "fasttag_transactions_transactionReference_idx" ON "fasttag_transactions"("transactionReference");

