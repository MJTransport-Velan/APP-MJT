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
export type FixedAssetStatus = 'ACTIVE' | 'UNDER_TRANSFER' | 'DISPOSED' | 'WRITTEN_OFF';

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
  vehicleLoans: { id: string; loanNumber: string; status: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface FundingLine {
  type: 'BANK' | 'CASH' | 'LOAN' | 'SUPPLIER';
  amount: number;
  fundAccountId?: string;
  vehicleLoanId?: string;
}

// Vehicle Loan
export type LenderType = 'BANK' | 'NBFC' | 'PRIVATE_FINANCE' | 'INTERNAL';
export type VehicleLoanStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'CLOSED' | 'FORECLOSED' | 'REJECTED';
export type VehicleLoanInstallmentStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'WAIVED';

export interface VehicleLoanInstallment {
  id: string;
  installmentNo: number;
  dueDate: string;
  emiAmount: number;
  principalComponent: number;
  interestComponent: number;
  lateFeeAmount: number;
  status: VehicleLoanInstallmentStatus;
  paidDate: string | null;
}

export interface VehicleLoanDisbursement {
  id: string;
  disbursementDate: string;
  amount: number;
}

export interface VehicleLoan {
  id: string;
  loanNumber: string;
  lenderType: LenderType;
  lenderName: string;
  loanAccountNumber: string | null;
  principalAmount: number;
  processingFee: number;
  interestRatePercent: number;
  disbursementDate: string;
  emiStartDate: string;
  emiAmount: number;
  tenureMonths: number;
  status: VehicleLoanStatus;
  outstandingPrincipal: number;
  vehicle: VehicleRef;
  fixedAsset: { id: string; assetCode: string } | null;
  installments: VehicleLoanInstallment[];
  disbursements: VehicleLoanDisbursement[];
  createdAt: string;
  updatedAt: string;
}

// Vehicle Expense categories now live in fleet.types.ts (extended additively).

// Vehicle Tyre
export type VehicleTyreStatus = 'INSTALLED' | 'REMOVED' | 'SCRAPPED';

export interface TyreMovement {
  id: string;
  movementType: 'INSTALL' | 'ROTATE' | 'REMOVE' | 'SCRAP';
  fromVehicleId: string | null;
  toVehicleId: string | null;
  fromPosition: string | null;
  toPosition: string | null;
  odometerReading: number | null;
  createdAt: string;
}

export interface VehicleTyre {
  id: string;
  tyre: { id: string; brand: string; code: string; size: string | null };
  vehicle: VehicleRef | null;
  serialNumber: string | null;
  position: string | null;
  installedDate: string;
  installedOdometer: number | null;
  removedDate: string | null;
  removedOdometer: number | null;
  status: VehicleTyreStatus;
  cost: number | null;
  movements: TyreMovement[];
  createdAt: string;
  updatedAt: string;
}

// Vehicle Battery
export type VehicleBatteryStatus = 'INSTALLED' | 'REPLACED' | 'DISPOSED';

export interface VehicleBattery {
  id: string;
  vehicle: VehicleRef;
  brand: string;
  serialNumber: string | null;
  installedDate: string;
  installedOdometer: number | null;
  warrantyMonths: number | null;
  warrantyExpiryDate: string | null;
  replacedDate: string | null;
  status: VehicleBatteryStatus;
  cost: number | null;
  createdAt: string;
  updatedAt: string;
}

// Vehicle Compliance
export type ComplianceType = 'INSURANCE' | 'PERMIT' | 'FITNESS' | 'ROAD_TAX' | 'POLLUTION';
export type ComplianceRecordStatus = 'ACTIVE' | 'EXPIRED' | 'RENEWED';
export type InsuranceClaimStatus = 'FILED' | 'APPROVED' | 'SETTLED' | 'REJECTED';

export interface VehicleInsuranceClaim {
  id: string;
  claimNumber: string;
  claimDate: string;
  claimAmount: number;
  settledAmount: number | null;
  settlementDate: string | null;
  status: InsuranceClaimStatus;
}

export interface VehicleComplianceRecord {
  id: string;
  vehicle: VehicleRef;
  complianceType: ComplianceType;
  documentNumber: string;
  issuerName: string | null;
  issueDate: string;
  expiryDate: string;
  premiumOrFeeAmount: number | null;
  documentUrl: string | null;
  renewedFromId: string | null;
  status: ComplianceRecordStatus;
  claims: VehicleInsuranceClaim[];
  createdAt: string;
  updatedAt: string;
}

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

// Asset Transfer
export type AssetTransferType = 'DEPARTMENT' | 'CUSTODY' | 'LOCATION';

export interface AssetTransfer {
  id: string;
  asset: { id: string; assetCode: string; assetName: string; status: FixedAssetStatus };
  transferType: AssetTransferType;
  fromDepartment: { id: string; name: string } | null;
  toDepartment: { id: string; name: string } | null;
  fromResponsiblePersonId: string | null;
  toResponsiblePersonId: string | null;
  transferDate: string;
  reason: string | null;
  approvalStatus: ApprovalStatus;
  createdAt: string;
  updatedAt: string;
}

// Asset Disposal
export type AssetDisposalType = 'SALE' | 'SCRAP' | 'WRITE_OFF' | 'THEFT' | 'ACCIDENT_TOTAL_LOSS' | 'DONATION';

export interface AssetDisposal {
  id: string;
  asset: { id: string; assetCode: string; assetName: string; category: string };
  disposalType: AssetDisposalType;
  disposalDate: string;
  saleValue: number | null;
  netBookValueAtDisposal: number;
  gainLossAmount: number;
  buyerDetails: string | null;
  insuranceClaim: { id: string; claimNumber: string } | null;
  exchangeGroupId: string | null;
  approvalStatus: ApprovalStatus;
  createdAt: string;
  updatedAt: string;
}

// Depreciation Run
export type DepreciationPeriodType = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
export type DepreciationRunStatus = 'DRAFT' | 'CALCULATED' | 'APPROVED';

export interface DepreciationRunLine {
  id: string;
  asset: { id: string; assetCode: string; assetName: string; category: string };
  openingValue: number;
  depreciationAmount: number;
  closingValue: number;
  method: DepreciationMethod;
}

export interface DepreciationRun {
  id: string;
  runNumber: string;
  periodType: DepreciationPeriodType;
  periodStart: string;
  periodEnd: string;
  status: DepreciationRunStatus;
  lines: DepreciationRunLine[];
  createdAt: string;
  updatedAt: string;
}

// Vehicle Cost Summary
export interface VehicleCostSummary {
  asset: { id: string; assetCode: string; assetName: string; category: string };
  vehicle: VehicleRef | null;
  purchaseCost: number;
  loanPrincipalRepaid: number;
  loanInterestPaid: number;
  depreciationToDate: number;
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
    loanOutstanding: number;
    todaysExpenses: number;
  };
  complianceDueSoon: {
    id: string;
    vehicle: VehicleRef;
    complianceType: ComplianceType;
    documentNumber: string;
    expiryDate: string;
  }[];
  topExpenseVehicles: { vehicle: VehicleRef | null; totalExpense: number }[];
}

export type { PaginationMeta };
