/**
 * Loans & Advances Given — money the business lends OUT, to a friend, a
 * relative, or anyone with no master record of their own.
 *
 * The mirror image of `Loan` in loans.types.ts, which is only ever money the
 * business BORROWED. Lending is an asset, not an expense: cash turns into
 * something owed back, so none of this reaches Profit & Loss.
 */
export type LoanGivenStatus = 'OUTSTANDING' | 'REPAID' | 'WRITTEN_OFF';

export const LOAN_GIVEN_STATUS_LABELS: Record<LoanGivenStatus, string> = {
  OUTSTANDING: 'Still Owed',
  REPAID: 'Fully Repaid',
  WRITTEN_OFF: 'Written Off',
};

export interface LoanGivenRepayment {
  id: string;
  amount: number;
  repaymentDate: string;
  fundAccountType: 'BANK' | 'CASH';
  fundAccountId: string;
  referenceNumber: string | null;
  remarks: string | null;
  createdAt: string;
}

export interface LoanGivenTotals {
  repaid: number;
  /** amount − repayments, computed live on the server. Never stored. */
  outstanding: number;
  repaymentCount: number;
  isOverdue: boolean;
}

/**
 * OPENING = the money was already lent out on the migration date and was
 * carried over from the old books. Registering one moves no money, since the
 * opening Bank/Cash balance already accounts for the cash having left.
 */
export type LoanGivenOrigin = 'NEW' | 'OPENING';

export interface LoanGiven {
  id: string;
  referenceNumber: string;
  partyName: string;
  partyContact: string | null;
  amount: number;
  givenDate: string;
  expectedReturnDate: string | null;
  fundAccountType: 'BANK' | 'CASH';
  fundAccountId: string;
  status: LoanGivenStatus;
  origin: LoanGivenOrigin;
  openingAsOfDate: string | null;
  remarks: string | null;
  writtenOffAt: string | null;
  writtenOffReason: string | null;
  totals: LoanGivenTotals;
  repayments: LoanGivenRepayment[];
  createdAt: string;
  updatedAt: string;
}

export interface LoanGivenSummary {
  totalGiven: number;
  totalRepaid: number;
  totalOutstanding: number;
  overdueAmount: number;
  overdueCount: number;
  writtenOffTotal: number;
}
