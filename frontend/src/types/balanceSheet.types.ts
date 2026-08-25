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

export interface BalanceSheetAssets {
  bankAndCash: number;
  customerReceivables: number;
  advancesRecoverable: number;
  fixedAssets: number;
  otherAssets: number;
}

export interface BalanceSheetLiabilities {
  capitalAccount: number;
  supplierPayables: number;
  driverEmployeePayables: number;
  customerAdvances: number;
  otherLiabilities: number;
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
  capitalAccount: NamedAmountRow[];
}

export interface BalanceSheetResult {
  asOfDate: string;
  isToday: boolean;
  generatedAt: string;
  assets: BalanceSheetAssets;
  liabilities: BalanceSheetLiabilities;
  totalAssets: number;
  totalLiabilities: number;
  netPosition: number;
  reconciliation: {
    reconciled: boolean;
    difference: number;
    equation: string;
  };
  breakdown: BalanceSheetBreakdown;
  limitations: string[];
}
