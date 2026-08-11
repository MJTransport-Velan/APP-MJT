// Phase 7 — Accounting Foundation (Chart of Accounts, Ledgers, Financial
// Years/Periods, Cost Centers, Number Series, Opening Balances). No voucher/
// posting engine yet — see backend prisma/schema.prisma PHASE 7 comment.

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export type FinancialYearStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'LOCKED';
export type AccountingPeriodStatus = 'OPEN' | 'CLOSED' | 'LOCKED' | 'FROZEN';
export type AccountingPeriodType = 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';
export type AccountClassification = 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE' | 'EQUITY';
export type BalanceSide = 'DEBIT' | 'CREDIT';
export type LedgerPartyType = 'NONE' | 'CUSTOMER' | 'SUPPLIER' | 'DRIVER' | 'EMPLOYEE' | 'BANK' | 'VEHICLE' | 'OTHER';
export type CostCenterRefType = 'NONE' | 'VEHICLE' | 'DRIVER' | 'SUPPLIER' | 'TRIP' | 'OTHER';
export type NumberSeriesDocumentType =
  | 'LEDGER'
  | 'COST_CENTER'
  | 'JOURNAL_VOUCHER'
  | 'RECEIPT_VOUCHER'
  | 'PAYMENT_VOUCHER'
  | 'SALES_VOUCHER'
  | 'PURCHASE_VOUCHER'
  | 'DEBIT_NOTE'
  | 'CREDIT_NOTE'
  | 'CONTRA_VOUCHER'
  | 'OPENING_BALANCE_VOUCHER';
export type NumberSeriesResetFrequency = 'NEVER' | 'FINANCIAL_YEAR' | 'MONTHLY';
export type ApprovalRuleModule = 'LEDGER_CREATION' | 'COST_CENTER_CREATION' | 'VOUCHER' | 'PETTY_CASH_REQUEST';

export interface Organization {
  id: string;
  code: string;
  name: string;
  gstNumber: string | null;
  panNumber: string | null;
  tanNumber: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialYear {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  booksBeginDate: string;
  previousFinancialYearId: string | null;
  status: FinancialYearStatus;
  isCurrent: boolean;
  closedAt: string | null;
  lockedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountingPeriod {
  id: string;
  financialYearId: string;
  name: string;
  periodType: AccountingPeriodType;
  sequenceNo: number;
  startDate: string;
  endDate: string;
  status: AccountingPeriodStatus;
  closedAt: string | null;
}

export interface PeriodLockOverride {
  id: string;
  accountingPeriodId: string;
  overriddenById: string;
  reason: string;
  overriddenAt: string;
  revertedAt: string | null;
}

export interface AccountGroup {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  parentGroupId: string | null;
  classification: AccountClassification;
  path: string;
  level: number;
  isSystemGroup: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccountGroupNode extends AccountGroup {
  children: AccountGroupNode[];
}

export interface Ledger {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  accountGroupId: string;
  classification: AccountClassification;
  normalBalance: BalanceSide;
  currencyId: string | null;
  openingBalance: string;
  openingBalanceType: BalanceSide;
  partyType: LedgerPartyType;
  partyId: string | null;
  gstNumber: string | null;
  panNumber: string | null;
  tanNumber: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  bankBranch: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  creditPeriodDays: number | null;
  creditLimit: string | null;
  isSystemLedger: boolean;
  isEditable: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CostCenter {
  id: string;
  organizationId: string;
  costCategoryId: string;
  code: string;
  name: string;
  parentCostCenterId: string | null;
  path: string;
  level: number;
  refType: CostCenterRefType;
  refId: string | null;
  isSystemCostCenter: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CostCenterNode extends CostCenter {
  children: CostCenterNode[];
}

export interface AccountingPreference {
  id: string;
  organizationId: string;
  baseCurrencyId: string | null;
  decimalPrecision: number;
  negativeCashAllowed: boolean;
  backDateEntryAllowed: boolean;
  backDateAllowedDays: number;
  voucherApprovalRequired: boolean;
  numberingMode: 'AUTO' | 'MANUAL';
  costCenterMandatory: boolean;
  narrationMandatory: boolean;
  attachmentMandatory: boolean;
  allowDuplicateReference: boolean;
  financialLockDays: number;
  updatedAt: string;
}

export interface NumberSeries {
  id: string;
  organizationId: string;
  documentType: NumberSeriesDocumentType;
  financialYearId: string | null;
  prefix: string | null;
  suffix: string | null;
  nextNumber: number;
  padWidth: number;
  resetFrequency: NumberSeriesResetFrequency;
  lastResetPeriod: string | null;
  isActive: boolean;
}

export interface OpeningBalanceEntry {
  id: string;
  financialYearId: string;
  ledgerId: string;
  amount: string;
  balanceType: BalanceSide;
  narration: string | null;
  isCarryForward: boolean;
  isLocked: boolean;
  enteredAt: string;
  ledger?: { id: string; code: string; name: string; classification: AccountClassification };
}

export interface OpeningBalanceTotals {
  debit: number;
  credit: number;
  difference: number;
  balanced: boolean;
}

export interface ApprovalRule {
  id: string;
  organizationId: string;
  name: string;
  module: ApprovalRuleModule;
  voucherType: string | null;
  minAmount: string | null;
  maxAmount: string | null;
  approverRoleId: string;
  sequenceOrder: number;
  autoApproveBelow: boolean;
  isActive: boolean;
}

export interface ExchangeRate {
  id: string;
  currencyId: string;
  rateDate: string;
  rateToBase: string;
  source: 'MANUAL' | 'API';
}
