-- CreateEnum
CREATE TYPE "FastTagStatementNature" AS ENUM ('DEBIT', 'CREDIT');

-- AlterTable
ALTER TABLE "fasttag_provider_transactions" ADD COLUMN     "nature" "FastTagStatementNature" NOT NULL DEFAULT 'DEBIT';

