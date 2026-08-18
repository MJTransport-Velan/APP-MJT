export type CapitalTransactionType = 'CONTRIBUTION' | 'WITHDRAWAL';

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
  totalContributed: number;
  totalWithdrawn: number;
  netBalance: number;
  transactions: { id: string; transactionNumber: string; type: CapitalTransactionType; amount: number; transactionDate: string; remarks: string | null }[];
}
