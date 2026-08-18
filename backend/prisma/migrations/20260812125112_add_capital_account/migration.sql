-- CreateEnum
CREATE TYPE "CapitalTransactionType" AS ENUM ('CONTRIBUTION', 'WITHDRAWAL');

-- CreateTable
CREATE TABLE "capital_partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capital_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capital_transactions" (
    "id" TEXT NOT NULL,
    "transactionNumber" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "type" "CapitalTransactionType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fundAccountType" "FundAccountType" NOT NULL,
    "fundAccountId" TEXT NOT NULL,
    "remarks" TEXT,
    "organizationId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capital_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "capital_partners_name_key" ON "capital_partners"("name");

-- CreateIndex
CREATE UNIQUE INDEX "capital_transactions_transactionNumber_key" ON "capital_transactions"("transactionNumber");

-- CreateIndex
CREATE INDEX "capital_transactions_partnerId_idx" ON "capital_transactions"("partnerId");

-- AddForeignKey
ALTER TABLE "capital_transactions" ADD CONSTRAINT "capital_transactions_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "capital_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

