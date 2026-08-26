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
}

export interface LoanRow extends NamedAmountRow {
  lenderName: string;
  loanType: string;
  linkedTo: string | null;
}

export interface BalanceSheetFixedAssets {
  vehicles: number;
  equipmentAndOther: number;
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
  taxPayables: number;
  otherLiabilities: number;
}

/** Drawings reduce equity, so totalEquity = ownerCapital + retainedProfit − drawings. */
export interface BalanceSheetEquity {
  ownerCapital: number;
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
