/**
 * Opening Balance & Migration — the old system's closing position brought
 * in as this system's opening position.
 *
 * An opening balance is a POSITION, not a transaction: it is never a
 * receipt, payment, income or expense, and nothing on these screens creates
 * a Financial Entry.
 */
export type OpeningBalanceCategory =
  | 'BANK'
  | 'CASH'
  | 'RECEIVABLE'
  | 'PAYABLE'
  | 'OWNER_FUNDS'
  | 'OTHER_ASSET'
  | 'OTHER_LIABILITY'
  | 'OTHER_EQUITY';

export type OpeningFundClassification = 'CAPITAL' | 'OWNER_LOAN' | 'OTHER_LIABILITY' | 'UNCLASSIFIED';
export type MigrationRecordStatus = 'CONFIRMED' | 'NEEDS_REVIEW' | 'UNVERIFIED' | 'RECLASSIFIED';
export type MigrationStatus = 'DRAFT' | 'FINALIZED';
export type AssetOrigin = 'OPENING' | 'NEW_PURCHASE';
export type LoanOrigin = 'OPENING' | 'NEW';

export const OPENING_CATEGORY_LABELS: Record<OpeningBalanceCategory, string> = {
  BANK: 'Bank Opening Balance',
  CASH: 'Cash Opening Balance',
  RECEIVABLE: 'Customer Opening Outstanding',
  PAYABLE: 'Supplier Opening Outstanding',
  OWNER_FUNDS: 'Owner / Partner Opening Funds',
  OTHER_ASSET: 'Other Opening Asset',
  OTHER_LIABILITY: 'Other Opening Liability',
  OTHER_EQUITY: 'Other Opening Equity',
};

export const CLASSIFICATION_LABELS: Record<OpeningFundClassification, string> = {
  CAPITAL: 'Capital (stays in the business)',
  OWNER_LOAN: 'Owner Loan (business owes it back)',
  OTHER_LIABILITY: 'Other Liability',
  UNCLASSIFIED: 'Needs Review — not decided yet',
};

export const MIGRATION_STATUS_LABELS: Record<MigrationRecordStatus, string> = {
  CONFIRMED: 'Confirmed',
  NEEDS_REVIEW: 'Needs Review',
  UNVERIFIED: 'Unverified',
  RECLASSIFIED: 'Reclassified',
};

export interface FinancialMigration {
  id: string;
  migrationDate: string;
  previousSystem: string;
  previousClosingDate: string | null;
  notes: string | null;
  status: MigrationStatus;
  finalizedAt: string | null;
}

export interface OpeningBalanceEntry {
  id: string;
  migrationId: string;
  category: OpeningBalanceCategory;
  /** The bank/cash account, customer, supplier, owner or free-form description this row is for. */
  name: string;
  amount: number;
  bankAccountId: string | null;
  cashAccountId: string | null;
  companyId: string | null;
  supplierId: string | null;
  capitalPartnerId: string | null;
  label: string | null;
  classification: OpeningFundClassification | null;
  status: MigrationRecordStatus;
  source: string;
  referenceNumber: string | null;
  referenceDate: string | null;
  remarks: string | null;
  appliedAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OpeningBalanceListResult {
  migration: FinancialMigration | null;
  entries: OpeningBalanceEntry[];
}

export interface MigrationSummaryRow {
  id: string;
  name: string;
  amount: number;
  status: string;
}

/**
 * The reconciliation view (§20). `difference` is deliberately NOT forced to
 * zero — an opening position that does not add up is shown as unreconciled
 * instead of being quietly plugged.
 */
export interface MigrationSummary {
  migration: FinancialMigration | null;
  bank: { total: number; rows: MigrationSummaryRow[] };
  cash: { total: number; rows: MigrationSummaryRow[] };
  assets: { bookValue: number; grossCost: number; accumulatedDepreciation: number; count: number };
  receivables: { total: number; count: number };
  payables: { total: number; count: number };
  loans: { openingOutstanding: number; currentOutstanding: number; originalPrincipal: number; count: number };
  /** Money already lent out at migration — an asset. `given` is what was carried
   *  over and counts towards totalAssets; `recoverable` is what is still expected
   *  back today, after repayments received since and excluding write-offs. */
  loansGiven: { given: number; recoverable: number; count: number };
  ownerFunds: { capital: number; ownerLoan: number; otherLiability: number; unclassified: number; total: number };
  other: { otherAssets: number; otherLiabilities: number; otherEquity: number };
  statusCounts: Record<string, number>;
  totals: {
    totalAssets: number;
    totalLiabilities: number;
    totalCapital: number;
    difference: number;
    reconciled: boolean;
    unclassifiedAmount: number;
  };
}
