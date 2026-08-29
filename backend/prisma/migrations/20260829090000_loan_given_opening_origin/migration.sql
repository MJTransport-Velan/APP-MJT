-- Loans given can now be carried over from the old books as opening balances,
-- the same way Loan.origin = OPENING already works for money borrowed.
--
-- Registering an OPENING loan given moves no money: the opening Bank/Cash
-- balance entered during migration already reflects that the cash left. Every
-- existing row was entered live and did debit an account, so NEW is the
-- correct default and no existing row changes meaning.
-- AlterTable
ALTER TABLE "loans_given" ADD COLUMN     "openingAsOfDate" TIMESTAMP(3),
ADD COLUMN     "origin" "LoanOrigin" NOT NULL DEFAULT 'NEW';
