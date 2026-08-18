export type FinancialEntryType =
  | 'MONEY_RECEIVED'
  | 'MONEY_PAID'
  | 'MONEY_TRANSFER'
  | 'EXPENSE'
  | 'ADVANCE_RECEIVED'
  | 'ADVANCE_GIVEN'
  | 'REFUND_RECEIVED'
  | 'REFUND_PAID'
  | 'LOAN_RECEIVED'
  | 'LOAN_REPAYMENT'
  | 'SALARY_SETTLEMENT'
  | 'ADJUSTMENT';

export type FinancialPartyType = 'CUSTOMER' | 'SUPPLIER' | 'DRIVER' | 'EMPLOYEE' | 'BANK' | 'CASH' | 'LOAN_PROVIDER' | 'VEHICLE' | 'TRIP' | 'EXPENSE' | 'OTHER';

export type FinancialEntryStatus = 'DRAFT' | 'COMPLETED' | 'CANCELLED' | 'REVERSED';

export type FinancialEntryPurpose =
  | 'TRIP_ADVANCE'
  | 'TRIP_PAYMENT'
  | 'SUPPLIER_PAYMENT'
  | 'CLIENT_PAYMENT'
  | 'DRIVER_ADVANCE'
  | 'SALARY'
  | 'FUEL'
  | 'REPAIR'
  | 'INSURANCE'
  | 'LOAN_EMI'
  | 'CUSTOMER_REFUND'
  | 'SUPPLIER_REFUND'
  | 'OFFICE_EXPENSE'
  | 'TOLL'
  | 'OTHER';

export interface FinancialParty {
  type: FinancialPartyType;
  id: string | null;
  label: string;
}

export interface SettlementPlanItem {
  targetType: FinancialPartyType | 'INVOICE' | 'BILL' | 'TRIP' | 'ADVANCE';
  targetId: string | null;
  targetLabel: string;
  amount: number;
  sourceDocumentType: string;
  sourceDocumentId: string;
}

export interface FinancialEntry {
  id: string;
  entryNumber: string;
  entryType: FinancialEntryType;
  entryDate: string;
  source: FinancialParty;
  destination: FinancialParty;
  amount: number;
  paymentMode: { id: string; name: string; code: string } | null;
  referenceNumber: string | null;
  remarks: string | null;
  purpose: FinancialEntryPurpose;
  purposeNotes: string | null;
  status: FinancialEntryStatus;
  // Populated only when this entry was auto-split FIFO across the
  // Customer/Supplier's outstanding Invoices/Bills/Trips — see
  // financial-entry.service.ts settleCustomerFIFO/settleSupplierFIFO.
  appliedTo: SettlementPlanItem[];
  fleet: {
    vehicleId: string | null;
    tripId: string | null;
    quantityLiters: number | null;
    ratePerLiter: number | null;
    odometerReading: number | null;
    fuelEntryId: string | null;
    fastTagTransactionId: string | null;
  };
  sourceDocument: { type: string; id: string | null } | null;
  correctionOf: { id: string; entryNumber: string } | null;
  correctedBy: { id: string; entryNumber: string } | null;
  reversalOf: { id: string; entryNumber: string } | null;
  reversedBy: { id: string; entryNumber: string } | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFinancialEntryInput {
  entryType: FinancialEntryType;
  entryDate: string;
  sourceType: FinancialPartyType;
  sourceId?: string;
  sourceLabel?: string;
  destinationType: FinancialPartyType;
  destinationId?: string;
  destinationLabel?: string;
  amount: number;
  paymentModeId?: string;
  referenceNumber?: string;
  remarks?: string;
  purpose: FinancialEntryPurpose;
  purposeNotes?: string;
  // Which calendar month a purpose=SALARY entry covers ("YYYY-MM"),
  // distinct from entryDate (when it was actually paid). Falls back to
  // entryDate's own month when omitted. Set by the Financial Entry
  // "Salary Entry" toggle (Record Office Expense dialog).
  salaryPeriod?: string;
  // Optional Fleet-module linkage — only used when purpose is FUEL (all
  // three fuel fields) or TOLL (vehicleId only). Safe to omit.
  vehicleId?: string;
  tripId?: string;
  quantityLiters?: number;
  ratePerLiter?: number;
  odometerReading?: number;
}

export interface BankAndCashState {
  bankAccounts: { id: string; name: string; bankName: string | null; accountNumber: string; openingBalance: number; currentBalance: number }[];
  cashAccounts: { id: string; name: string; openingBalance: number; currentBalance: number }[];
  totalBankBalance: number;
  totalCashBalance: number;
}

export interface CustomerFinancialState {
  customer: { id: string; name: string };
  totalBilled: number;
  totalReceived: number;
  advance: number;
  adjusted: number;
  outstanding: number;
  overdue: number;
  refund: number;
}

export interface SupplierFinancialState {
  supplier: { id: string; name: string };
  totalPayable: number;
  totalPaid: number;
  advance: number;
  adjusted: number;
  outstanding: number;
  overdue: number;
  refund: number;
}

export interface DriverFinancialState {
  driver: { id: string; name: string; code: string };
  totalAdvance: number;
  adjusted: number;
  remaining: number;
}

export interface EmployeeFinancialState {
  employee: { id: string; name: string; employeeCode: string };
  totalAdvance: number;
  adjusted: number;
  remaining: number;
}

export interface FinancialDashboardSummary {
  moneyIn: number;
  moneyOut: number;
  cashAvailable: number;
  bankAvailable: number;
  customerOutstanding: number;
  supplierOutstanding: number;
  driverAdvances: number;
  employeeAdvances: number;
  tripRevenue: number;
  tripCost: number;
  tripProfit: number;
}
