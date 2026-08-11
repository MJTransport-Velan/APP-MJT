-- DropForeignKey
ALTER TABLE "fasttag_accounts" DROP CONSTRAINT "fasttag_accounts_vehicleId_fkey";

-- DropIndex
DROP INDEX "fasttag_accounts_vehicleId_key";

-- AlterTable
ALTER TABLE "fasttag_accounts" DROP COLUMN "vehicleId";

-- AlterTable
ALTER TABLE "fasttag_transactions" ADD COLUMN     "fundAccountId" TEXT,
ADD COLUMN     "fundAccountType" TEXT,
ADD COLUMN     "vehicleId" TEXT;

-- CreateIndex
CREATE INDEX "fasttag_transactions_vehicleId_idx" ON "fasttag_transactions"("vehicleId");

-- AddForeignKey
ALTER TABLE "fasttag_transactions" ADD CONSTRAINT "fasttag_transactions_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

