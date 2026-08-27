/**
 * Diesel / Fuel Card prepaid account.
 *
 * One shared account for the whole fleet: a recharge tops up one balance
 * and whichever card is swiped draws down from that same balance. There is
 * no per-card balance — `FuelCardUsageRow` is how much of the one balance a
 * card has spent, never what is left on it.
 */
export type FuelCardTransactionType = 'RECHARGE' | 'USAGE' | 'REFUND' | 'ADJUSTMENT';

export const FUEL_CARD_TRANSACTION_LABELS: Record<FuelCardTransactionType, string> = {
  RECHARGE: 'Recharge',
  USAGE: 'Card Payment',
  REFUND: 'Refund',
  ADJUSTMENT: 'Adjustment',
};

export interface FuelCardAccount {
  id: string;
  accountRef: string | null;
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FuelCardTransaction {
  id: string;
  accountId: string;
  type: FuelCardTransactionType;
  amount: number;
  fuelCard: { id: string; cardNumber: string } | null;
  vehicle: { id: string; registrationNumber: string } | null;
  /** Set on a USAGE row — the card-billed fill that spent this money. */
  fuelEntry: { id: string; entryDate: string; quantityLiters: number | null; location: string | null } | null;
  transactionDate: string;
  referenceNumber: string | null;
  remarks: string | null;
  fundAccountType: 'BANK' | 'CASH' | null;
  fundAccountId: string | null;
  createdAt: string;
}

export interface FuelCardUsageRow {
  fuelCardId: string | null;
  cardNumber: string;
  issuedTo: string | null;
  totalUsage: number;
  transactionCount: number;
}

export interface FuelCardAccountSummary {
  accountId: string;
  currentBalance: number;
  totalRecharge: number;
  totalUsage: number;
  totalRefund: number;
  totalAdjustment: number;
  cardUsage: FuelCardUsageRow[];
}
