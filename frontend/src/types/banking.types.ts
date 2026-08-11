// Banking & Cash Management — direct-balance model. Every Bank/Cash account
// carries its own currentBalance, mutated only by the money-movement flows
// that touch it (Receipt, Supplier Payment, Bank Transfer, Cheque clearance,
// Financial Entry...); there is no ledger/voucher underneath.
import type { PaginationMeta } from './accounting.types';

export type { PaginationMeta };

export type BankAccountType = 'SAVINGS' | 'CURRENT' | 'OD' | 'CC' | 'FIXED_DEPOSIT';
export type CashAccountType = 'MAIN' | 'PETTY' | 'BRANCH' | 'SITE' | 'EMERGENCY';
export type PaymentModeType = 'CASH' | 'CHEQUE' | 'UPI' | 'RTGS' | 'NEFT' | 'IMPS' | 'BANK_TRANSFER' | 'DD' | 'CARD' | 'WALLET' | 'QR' | 'CUSTOM';
export type FundAccountType = 'BANK' | 'CASH';
export type ChequeDirection = 'ISSUED' | 'RECEIVED';
export type ChequeStatus =
  | 'AVAILABLE'
  | 'ISSUED'
  | 'RECEIVED'
  | 'DEPOSITED'
  | 'PRESENTED'
  | 'CLEARED'
  | 'RETURNED'
  | 'BOUNCED'
  | 'CANCELLED'
  | 'STOP_PAYMENT'
  | 'EXPIRED';
export type PettyCashRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISBURSED' | 'CLOSED';
export type FinancialPartyType = 'CUSTOMER' | 'SUPPLIER' | 'DRIVER' | 'EMPLOYEE' | 'BANK' | 'CASH' | 'LOAN_PROVIDER' | 'VEHICLE' | 'TRIP' | 'EXPENSE' | 'OTHER';

export interface BankAccount {
  id: string;
  organizationId: string;
  accountHolderName: string;
  accountNumber: string;
  bankName: string | null;
  accountType: BankAccountType;
  ifscCode: string | null;
  micrCode: string | null;
  swiftCode: string | null;
  branchName: string | null;
  openingBalance: string;
  currentBalance: string;
  isPrimary: boolean;
  isDefaultPaymentAccount: boolean;
  isDefaultReceiptAccount: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface CashAccount {
  id: string;
  organizationId: string;
  cashAccountType: CashAccountType;
  responsiblePersonId: string | null;
  openingBalance: string;
  currentBalance: string;
  maximumLimit: string | null;
  approvalLimit: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface PaymentMode {
  id: string;
  code: string;
  name: string;
  type: PaymentModeType;
  requiresBankAccount: boolean;
  requiresChequeDetails: boolean;
  chargeApplicable: boolean;
  isSystemMode: boolean;
  isActive: boolean;
}

export interface BankTransfer {
  id: string;
  organizationId: string;
  transferNumber: string;
  transferDate: string;
  fromAccountType: FundAccountType;
  fromAccountId: string;
  toAccountType: FundAccountType;
  toAccountId: string;
  amount: string;
  transferCharges: string;
  paymentModeId: string | null;
  referenceNumber: string | null;
  narration: string | null;
  paymentMode?: { id: string; code: string; name: string };
  createdAt: string;
}

export interface ChequeBook {
  id: string;
  organizationId: string;
  bankAccountId: string;
  bookNumber: string;
  startNumber: string;
  endNumber: string;
  totalLeaves: number;
  isActive: boolean;
  bankAccount?: { id: string; accountHolderName: string; accountNumber: string };
}

export interface Cheque {
  id: string;
  organizationId: string;
  bankAccountId: string;
  chequeBookId: string | null;
  direction: ChequeDirection;
  chequeNumber: string;
  chequeDate: string;
  isPostDated: boolean;
  partyType: FinancialPartyType | null;
  partyId: string | null;
  payeeOrPayerName: string | null;
  amount: string;
  status: ChequeStatus;
  depositedIntoBankAccountId: string | null;
  depositDate: string | null;
  clearanceDate: string | null;
  bounceReason: string | null;
  stopPaymentReason: string | null;
  cancellationReason: string | null;
  bankAccount?: { id: string; accountHolderName: string; accountNumber: string };
  chequeBook?: { id: string; bookNumber: string };
  depositedIntoBankAccount?: { id: string; accountHolderName: string; accountNumber: string };
  createdAt: string;
}

export interface PettyCashRequest {
  id: string;
  organizationId: string;
  cashAccountId: string;
  requestedById: string;
  amount: string;
  purpose: string;
  status: PettyCashRequestStatus;
  approvedById: string | null;
  approvedAt: string | null;
  rejectedById: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  disbursementTransferId: string | null;
  cashAccount?: CashAccount;
  disbursementTransfer?: { id: string; transferNumber: string };
  createdAt: string;
}

export interface BankingDashboardSummary {
  bankAccounts: { id: string; accountHolderName: string; accountNumber: string; bookBalance: number }[];
  cashAccounts: { id: string; cashAccountType: CashAccountType; balance: number }[];
  todaysReceipts: number;
  todaysPayments: number;
  pendingCheques: number;
  pendingApprovals: number;
  recentTransfers: { id: string; transferNumber: string; transferDate: string; amount: string; fromAccountType: FundAccountType; toAccountType: FundAccountType }[];
}
