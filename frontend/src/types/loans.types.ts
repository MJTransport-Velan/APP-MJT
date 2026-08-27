import type { PaginationMeta } from './accounting.types';

export type LoanType = 'VEHICLE_LOAN' | 'BANK_LOAN' | 'BUSINESS_LOAN' | 'OWNER_LOAN' | 'OTHER_LOAN';
export type LoanStatus = 'ACTIVE' | 'CLOSED' | 'FORECLOSED';
export type LoanInstallmentStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'WAIVED';
/** OPENING = already running when the business moved off its old system. */
export type LoanOrigin = 'OPENING' | 'NEW';

export const LOAN_TYPE_LABELS: Record<LoanType, string> = {
  VEHICLE_LOAN: 'Vehicle Loan',
  BANK_LOAN: 'Bank Loan',
  BUSINESS_LOAN: 'Business Loan',
  OWNER_LOAN: 'Owner Loan',
  OTHER_LOAN: 'Other Loan',
};

export interface LoanInstallment {
  id: string;
  installmentNo: number;
  dueDate: string;
  emiAmount: number;
  principalComponent: number;
  interestComponent: number;
  status: LoanInstallmentStatus;
  paidDate: string | null;
  paidAmount: number | null;
  referenceNumber: string | null;
  remarks: string | null;
}

/** Every figure here is computed server-side from the schedule — none is stored. */
export interface LoanTotals {
  principalPaid: number;
  interestPaid: number;
  totalEmiPaid: number;
  outstandingPrincipal: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
  remainingEmis: number;
  nextEmiDate: string | null;
  loanClosingDate: string | null;
}

export interface Loan {
  id: string;
  loanNumber: string;
  loanName: string;
  lenderName: string;
  loanType: LoanType;
  vehicle: { id: string; registrationNumber: string } | null;
  fixedAsset: { id: string; assetCode: string; assetName: string } | null;
  capitalPartner: { id: string; name: string } | null;
  loanStartDate: string;
  /** For an OPENING loan this is what was still owed at migration. */
  principalAmount: number;
  origin: LoanOrigin;
  /** What the lender originally sanctioned — only set for opening loans. */
  originalPrincipal: number | null;
  openingAsOfDate: string | null;
  migrationSource: string | null;
  migrationStatus: 'CONFIRMED' | 'NEEDS_REVIEW' | 'UNVERIFIED' | 'RECLASSIFIED' | null;
  interestRatePercent: number;
  tenureMonths: number;
  emiAmount: number;
  firstEmiDate: string;
  fundAccountType: 'BANK' | 'CASH';
  fundAccountId: string;
  loanAccountRef: string | null;
  status: LoanStatus;
  remarks: string | null;
  totals: LoanTotals;
  installments: LoanInstallment[];
  createdAt: string;
  updatedAt: string;
}

export interface UpcomingEmi {
  id: string;
  loanId: string;
  dueDate: string;
  installmentNo: number;
  vehicle: string | null;
  loanNumber: string;
  loanName: string;
  loanType: LoanType;
  lenderName: string;
  emiAmount: number;
  principalComponent: number;
  interestComponent: number;
  status: LoanInstallmentStatus;
}

export interface LoanDashboard {
  stats: {
    totalActiveLoans: number;
    totalLoanOutstanding: number;
    totalOriginalLoanAmount: number;
    totalOpeningOutstanding: number;
    totalPrincipalPaid: number;
    totalInterestPaid: number;
    monthlyEmiCommitment: number;
    thisMonthEmi: number;
    thisMonthPrincipal: number;
    thisMonthInterest: number;
    paidEmiCount: number;
    pendingEmiCount: number;
    overdueEmiCount: number;
    overdueEmiAmount: number;
    nextEmiDate: string | null;
    nextEmiAmount: number | null;
  };
  upcomingEmis: UpcomingEmi[];
}

export type { PaginationMeta };
