-- AlterTable
ALTER TABLE "fasttag_provider_transactions" ADD COLUMN     "closingBalance" DECIMAL(12,2),
ADD COLUMN     "openingBalance" DECIMAL(12,2),
ADD COLUMN     "vendor" TEXT;

