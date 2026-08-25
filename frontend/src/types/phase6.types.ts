import type { PaginationMeta } from './admin.types';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface VehicleRef {
  id: string;
  registrationNumber: string;
}

// Asset Category
export type AssetType = 'VEHICLE' | 'LAND' | 'BUILDING' | 'FURNITURE' | 'COMPUTER' | 'MACHINERY' | 'OFFICE_EQUIPMENT' | 'WAREHOUSE_EQUIPMENT' | 'OTHER';
export type DepreciationMethod = 'STRAIGHT_LINE' | 'WRITTEN_DOWN_VALUE' | 'CUSTOM';

export interface AssetCategory {
  id: string;
  code: string;
  name: string;
  assetType: AssetType;
  usefulLifeMonths: number;
  depreciationMethod: DepreciationMethod;
  depreciationRatePercent: number | null;
  residualValuePercent: number;
  isSystemCategory: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Fixed Asset
export type FixedAssetStatus = 'ACTIVE' | 'WRITTEN_OFF';

export interface FixedAsset {
  id: string;
  assetCode: string;
  assetName: string;
  category: { id: string; name: string; assetType: AssetType };
  vehicle: VehicleRef | null;
  supplier: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
  purchaseDate: string;
  capitalizationDate: string;
  purchaseValue: number;
  residualValue: number;
  usefulLifeMonths: number;
  depreciationMethod: DepreciationMethod;
  currentValue: number;
  locationText: string | null;
  status: FixedAssetStatus;
  approvalStatus: ApprovalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FundingLine {
  type: 'BANK' | 'CASH' | 'SUPPLIER';
  amount: number;
  fundAccountId?: string;
}

// Vehicle Expense categories now live in fleet.types.ts (extended additively).

// FastTag
export type FastTagTransactionType = 'RECHARGE' | 'USAGE' | 'REFUND' | 'ADJUSTMENT';
export type FastTagTransactionStatus = 'IMPORTED' | 'PENDING' | 'VERIFIED' | 'ALLOCATED' | 'RECONCILED' | 'CANCELLED' | 'ADJUSTED';
export type FastTagPaymentSource = 'FASTAG_WALLET' | 'BANK' | 'OTHER';

// One shared prepaid wallet for the whole fleet (BlackBuck-style) — there is
// no per-vehicle account anymore.
export interface FastTagWallet {
  id: string;
  fastagNumber: string | null;
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FastTagTransaction {
  id: string;
  accountId: string;
  vehicle: VehicleRef | null;
  type: FastTagTransactionType;
  status: FastTagTransactionStatus;
  amount: number;
  trip: { id: string; tripNumber: string } | null;
  tollPlaza: string | null;
  location: string | null;
  transactionReference: string | null;
  paymentSource: FastTagPaymentSource;
  remarks: string | null;
  attachment: string | null;
  fundAccountType: 'BANK' | 'CASH' | null;
  fundAccountId: string | null;
  transactionDate: string;
  createdAt: string;
}

export interface FastTagWalletSummary {
  accountId: string;
  currentBalance: number;
  totalRecharge: number;
  totalUsage: number;
  totalRefund: number;
  totalAdjustment: number;
}

// Vehicle Cost Summary
export interface VehicleCostSummary {
  asset: { id: string; assetCode: string; assetName: string; category: string };
  vehicle: VehicleRef | null;
  purchaseCost: number;
  expensesByCategory: Record<string, number>;
  totalExpenses: number;
  driverCost: number;
  tripRevenue: number;
  totalCost: number;
}

// Asset Dashboard
export interface AssetDashboardSummary {
  stats: {
    totalAssets: number;
    activeVehicles: number;
    totalVehicleValue: number;
    todaysExpenses: number;
  };
  assetsByCategory: { category: { id: string; name: string } | null; assetCount: number; totalValue: number }[];
  topExpenseVehicles: { vehicle: VehicleRef | null; totalExpense: number }[];
}

export type { PaginationMeta };
