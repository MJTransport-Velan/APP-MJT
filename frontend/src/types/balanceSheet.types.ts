export interface NamedAmountRow {
  id: string;
  name: string;
  amount: number;
}

export interface FundAccountRow {
  id: string;
  name: string;
  bankName?: string | null;
  accountNumber?: string;
  openingBalance: number;
  currentBalance: number;
}

export interface FixedAssetRow extends NamedAmountRow {
  code: string;
  category: 'Vehicle' | 'Other';
  /** OPENING = carried over from the previous system; NEW_PURCHASE = bought through this one. */
  origin: 'OPENING' | 'NEW_PURCHASE';
  /** Original cost. `amount` is the book value. */
  grossValue: number;
}

export interface LoanRow extends NamedAmountRow {
  lenderName: string;
  loanType: string;
  linkedTo: string | null;
}

export interface BalanceSheetFixedAssets {
  vehicles: number;
  equipmentAndOther: number;
  /** Assets brought over from the previous system, at their book value. */
  openingAssets: number;
  /** Assets bought through this system. */
  newAssets: number;
  /** Original cost of every asset. */
  grossBlock: number;
  /** grossBlock − total, so it can never disagree with the book values. */
  accumulatedDepreciation: number;
  /** Net fixed assets: opening + new. */
  total: number;
}

export interface BalanceSheetCurrentAssets {
  cash: number;
  bank: number;
  receivables: number;
  advances: number;
  total: number;
}

export interface BalanceSheetAssets {
  fixedAssets: BalanceSheetFixedAssets;
  currentAssets: BalanceSheetCurrentAssets;
  otherAssets: number;
}

export interface BalanceSheetLiabilities {
  vehicleLoans: number;
  bankLoans: number;
  ownerLoans: number;
  otherLoans: number;
  supplierPayables: number;
  employeePayables: number;
  customerAdvances: number;
  /** Opening owner money not yet classified as capital or loan — never counted as equity. */
  openingUnclassified: number;
  taxPayables: number;
  otherLiabilities: number;
}

/** Drawings reduce equity, so totalEquity = ownerCapital + retainedProfit − drawings. */
export interface BalanceSheetEquity {
  ownerCapital: number;
  /** Equity carried forward from the previous system's closing position. */
  openingEquityAdjustments: number;
  retainedProfit: number;
  drawings: number;
}

export interface BalanceSheetBreakdown {
  bankAccounts: FundAccountRow[];
  cashAccounts: FundAccountRow[];
  customerReceivables: NamedAmountRow[];
  customerAdvances: NamedAmountRow[];
  supplierPayables: NamedAmountRow[];
  supplierAdvances: NamedAmountRow[];
  driverAdvances: NamedAmountRow[];
  employeeAdvances: NamedAmountRow[];
  driverPayables: NamedAmountRow[];
  employeePayables: NamedAmountRow[];
  fixedAssets: FixedAssetRow[];
  fixedAssetsVehicleTotal: number;
  fixedAssetsOtherTotal: number;
  loans: LoanRow[];
  /** Informal owner loans recorded on Capital & Owner Funds (no EMI schedule). */
  ownerLoans: NamedAmountRow[];
  capitalAccount: NamedAmountRow[];
  openingAssetRows: FixedAssetRow[];
  newAssetRows: FixedAssetRow[];
  openingOtherAssets: NamedAmountRow[];
  openingOtherLiabilities: NamedAmountRow[];
  openingOtherEquity: NamedAmountRow[];
  openingUnclassifiedOwnerFunds: NamedAmountRow[];
}

export interface BalanceSheetResult {
  asOfDate: string;
  isToday: boolean;
  generatedAt: string;
  assets: BalanceSheetAssets;
  liabilities: BalanceSheetLiabilities;
  equity: BalanceSheetEquity;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  reconciliation: {
    reconciled: boolean;
    difference: number;
    equation: string;
  };
  breakdown: BalanceSheetBreakdown;
  limitations: string[];
}
