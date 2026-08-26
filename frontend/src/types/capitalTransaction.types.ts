/**
 * Owner money is two different instruments and the type keeps them apart
 * (spec §9–§12): CONTRIBUTION/WITHDRAWAL move owner EQUITY, while
 * OWNER_LOAN_RECEIVED/REPAYMENT move a LIABILITY the business owes back.
 */
export type CapitalTransactionType = 'CONTRIBUTION' | 'WITHDRAWAL' | 'OWNER_LOAN_RECEIVED' | 'OWNER_LOAN_REPAYMENT';

/** Which side of the Balance Sheet a transaction type lands on. */
export type CapitalBucket = 'CAPITAL' | 'OWNER_LOAN';

export const CAPITAL_TRANSACTION_LABELS: Record<CapitalTransactionType, string> = {
  CONTRIBUTION: 'Capital Contribution',
  WITHDRAWAL: 'Capital Withdrawal (Drawing)',
  OWNER_LOAN_RECEIVED: 'Owner Loan Received',
  OWNER_LOAN_REPAYMENT: 'Owner Loan Repayment',
};

export const CAPITAL_BUCKET_OF: Record<CapitalTransactionType, CapitalBucket> = {
  CONTRIBUTION: 'CAPITAL',
  WITHDRAWAL: 'CAPITAL',
  OWNER_LOAN_RECEIVED: 'OWNER_LOAN',
  OWNER_LOAN_REPAYMENT: 'OWNER_LOAN',
};

export interface CapitalTransaction {
  id: string;
  transactionNumber: string;
  type: CapitalTransactionType;
  amount: number;
  transactionDate: string;
  fundAccountType: 'BANK' | 'CASH';
  fundAccountId: string;
  remarks: string | null;
  partner: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreateCapitalTransactionInput {
  partnerId: string;
  type: CapitalTransactionType;
  amount: number;
  transactionDate?: string;
  fundAccountType: 'BANK' | 'CASH';
  fundAccountId: string;
  remarks?: string;
}

export interface CapitalPartnerState {
  partner: { id: string; name: string };
  // Equity side
  totalContributed: number;
  totalWithdrawn: number;
  capitalBalance: number;
  // Liability side — what the business still owes this owner
  ownerLoanReceived: number;
  ownerLoanRepaid: number;
  ownerLoanBalance: number;
  /** Capital only, never capital + loan. Kept for existing callers. */
  netBalance: number;
  transactions: {
    id: string;
    transactionNumber: string;
    type: CapitalTransactionType;
    bucket: CapitalBucket;
    amount: number;
    transactionDate: string;
    remarks: string | null;
  }[];
}
