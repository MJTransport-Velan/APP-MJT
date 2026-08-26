-- Phase 2 — separate Owner Capital (equity) from Owner Loan (liability).
--
-- Money an owner puts in is two different things and the Balance Sheet has
-- to say which: a CONTRIBUTION is permanent capital that belongs in EQUITY,
-- while money the business is expected to repay is a LIABILITY. Previously
-- every owner transaction landed in one "capital" bucket, which overstated
-- equity and hid real debt.
--
-- Purely additive: the two existing values keep their meaning and every
-- existing row stays valid, so no data migration is required.
ALTER TYPE "CapitalTransactionType" ADD VALUE IF NOT EXISTS 'OWNER_LOAN_RECEIVED';
ALTER TYPE "CapitalTransactionType" ADD VALUE IF NOT EXISTS 'OWNER_LOAN_REPAYMENT';
