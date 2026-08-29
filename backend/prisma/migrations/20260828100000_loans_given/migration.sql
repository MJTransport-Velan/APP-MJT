-- Money the business lends OUT — to a friend, a relative, or anyone with no
-- master record of their own. The mirror image of "loans", which only ever
-- holds money the business borrowed.
--
-- It is an asset, not an expense: cash turns into something owed back, so
-- nothing here reaches Profit & Loss. The outstanding amount is never
-- stored; it is amount - SUM(repayments), computed live.

CREATE TYPE "LoanGivenStatus" AS ENUM ('OUTSTANDING', 'REPAID', 'WRITTEN_OFF');

CREATE TABLE "loans_given" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    -- Free text on purpose: a friend or relative is not a Customer,
    -- Supplier, Driver or Employee.
    "partyName" TEXT NOT NULL,
    "partyContact" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "givenDate" TIMESTAMP(3) NOT NULL,
    "expectedReturnDate" TIMESTAMP(3),
    "fundAccountType" "FundAccountType" NOT NULL,
    "fundAccountId" TEXT NOT NULL,
    "status" "LoanGivenStatus" NOT NULL DEFAULT 'OUTSTANDING',
    "remarks" TEXT,
    "writtenOffAt" TIMESTAMP(3),
    "writtenOffReason" TEXT,
    "organizationId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loans_given_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "loan_given_repayments" (
    "id" TEXT NOT NULL,
    "loanGivenId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "repaymentDate" TIMESTAMP(3) NOT NULL,
    -- A repayment does not have to land back in the account the money left.
    "fundAccountType" "FundAccountType" NOT NULL,
    "fundAccountId" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "remarks" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_given_repayments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "loans_given_referenceNumber_key" ON "loans_given"("referenceNumber");
CREATE INDEX "loans_given_status_idx" ON "loans_given"("status");
CREATE INDEX "loans_given_givenDate_idx" ON "loans_given"("givenDate");
CREATE INDEX "loan_given_repayments_loanGivenId_idx" ON "loan_given_repayments"("loanGivenId");

ALTER TABLE "loan_given_repayments" ADD CONSTRAINT "loan_given_repayments_loanGivenId_fkey" FOREIGN KEY ("loanGivenId") REFERENCES "loans_given"("id") ON DELETE CASCADE ON UPDATE CASCADE;
