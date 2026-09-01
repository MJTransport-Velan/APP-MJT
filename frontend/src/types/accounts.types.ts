import type { PaginationMeta } from './admin.types';

export type InvoiceStatus = 'DRAFT' | 'GENERATED' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
export type SupplierBillStatus = 'DRAFT' | 'GENERATED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
export type InvoiceChargeType = 'FUEL_RECOVERY' | 'DETENTION' | 'LOADING' | 'UNLOADING' | 'DISCOUNT' | 'ROUND_OFF' | 'OTHER';
export type CustomerCreditNoteCategory = 'RATE_DIFFERENCE' | 'SERVICE_CANCELLATION' | 'DAMAGE' | 'SHORT_DELIVERY' | 'DISCOUNT' | 'BILLING_CORRECTION' | 'OTHER';
export type CustomerDebitNoteCategory = 'ADDITIONAL_CHARGES' | 'PENALTY' | 'INTEREST' | 'FUEL_DIFFERENCE' | 'SHORT_COLLECTION' | 'OTHER';
export type SupplierCreditNoteCategory = 'BILL_CORRECTION' | 'RATE_REVISION' | 'DISCOUNT' | 'ADJUSTMENT' | 'REFUND' | 'OTHER';
export type SupplierDebitNoteCategory = 'DAMAGE_RECOVERY' | 'PENALTY' | 'SHORT_DELIVERY' | 'QUALITY_ISSUE' | 'FUEL_RECOVERY' | 'COMMISSION_RECOVERY' | 'OTHER';
export type CollectionActivityType = 'CALL' | 'EMAIL' | 'REMINDER' | 'PROMISE_TO_PAY' | 'NOTE';

export interface InvoiceCharge {
  id: string;
  chargeType: InvoiceChargeType;
  description: string | null;
  amount: number;
  sequence: number;
}

export interface CreditNote {
  id: string;
  creditNoteNumber: string;
  amount: number;
  reason: string;
  category?: CustomerCreditNoteCategory;
}

export interface CustomerDebitNote {
  id: string;
  debitNoteNumber: string;
  amount: number;
  reason: string;
  category: CustomerDebitNoteCategory;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  invoiceDate: string;
  dueDate: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  notes: string | null;
  creditPeriodDays?: number | null;
  company: { id: string; name: string };
  gstMaster: { id: string; name: string } | null;
  trips: { id: string; tripNumber: string; freightAmount: number | null }[];
  charges?: InvoiceCharge[];
  creditNotes: CreditNote[];
  customerDebitNotes?: CustomerDebitNote[];
  createdAt: string;
  updatedAt: string;
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  amount: number;
  receiptDate: string;
  referenceNumber: string | null;
  isAdvance: boolean;
  remarks: string | null;
  company: { id: string; name: string };
  invoice: { id: string; invoiceNumber: string } | null;
  paymentMode: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierBillCreditNote {
  id: string;
  creditNoteNumber: string;
  amount: number;
  reason: string;
  category: SupplierCreditNoteCategory;
}

export interface SupplierBillDebitNote {
  id: string;
  debitNoteNumber: string;
  amount: number;
  reason: string;
  category: SupplierDebitNoteCategory;
}

export interface SupplierBillPaymentRef {
  id: string;
  paymentNumber: string;
  amount: number;
  paymentDate: string;
  isRetentionRelease: boolean;
}

export interface SupplierBill {
  id: string;
  billNumber: string;
  status: SupplierBillStatus;
  billDate: string;
  dueDate: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  retentionAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  notes: string | null;
  supplier: { id: string; name: string };
  trip: { id: string; tripNumber: string } | null;
  creditNotes: SupplierBillCreditNote[];
  debitNotes: SupplierBillDebitNote[];
  payments: SupplierBillPaymentRef[];
  createdAt: string;
  updatedAt: string;
}

export interface SupplierPayment {
  id: string;
  paymentNumber: string;
  amount: number;
  paymentDate: string;
  referenceNumber: string | null;
  isAdvance: boolean;
  isRetentionRelease?: boolean;
  remarks: string | null;
  supplier: { id: string; name: string };
  trip: { id: string; tripNumber: string } | null;
  bill?: { id: string; billNumber: string } | null;
  paymentMode: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

// FASTag and Diesel are kept as their own line items (design brief) rather
// than folded into tripExpenses — sourced from VehicleExpense rows tagged
// with the trip (see trip-financial.service.ts computeTripLine).
export interface TripFinancialLine {
  tripId: string;
  tripNumber: string;
  income: number;
  supplierCharges: number;
  driverCost: number;
  dieselCost: number;
  fastTagCost: number;
  repairCost: number;
  otherExpenses: number;
  totalCost: number;
  profit: number;
}

export interface VehicleProfitLine {
  vehicleId: string;
  registrationNumber: string;
  tripCount: number;
  income: number;
  supplierCharges: number;
  driverCost: number;
  dieselCost: number;
  fastTagCost: number;
  repairCost: number;
  otherExpenses: number;
  totalCost: number;
  profit: number;
}

export interface SupplierProfitLine {
  supplierId: string;
  supplierName: string;
  tripCount: number;
  income: number;
  supplierCharges: number;
  driverCost: number;
  dieselCost: number;
  fastTagCost: number;
  repairCost: number;
  otherExpenses: number;
  totalCost: number;
  profit: number;
}

export interface CustomerProfitLine {
  companyId: string;
  companyName: string;
  tripCount: number;
  income: number;
  supplierCharges: number;
  driverCost: number;
  dieselCost: number;
  fastTagCost: number;
  repairCost: number;
  otherExpenses: number;
  totalCost: number;
  profit: number;
}

export interface AccountsDashboardSummary {
  // Finance-wide position (spec §3). Sourced from the Balance Sheet and the
  // Loans & EMI dashboard so these figures always match those screens.
  cashAvailable: number;
  bankAvailable: number;
  totalAssets: number;
  totalLiabilities: number;
  ownerCapital: number;
  ownerLoan: number;
  loanOutstanding: number;
  pendingEmiCount: number;
  overdueEmiCount: number;
  overdueEmiAmount: number;
  thisMonthEmi: number;
  nextEmiDate: string | null;
  nextEmiAmount: number | null;
  upcomingEmis: {
    id: string;
    loanId: string;
    dueDate: string;
    installmentNo: number;
    vehicle: string | null;
    loanNumber: string;
    loanName: string;
    lenderName: string;
    emiAmount: number;
    status: string;
  }[];
  outstandingReceivables: number;
  outstandingPayables: number;
  /** The slice of the two figures above that was carried over from the previous system. */
  openingReceivables?: number;
  openingPayables?: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  profit: number;
  todaysCollection?: number;
  todaysPayment?: number;
  overdueReceivablesCount?: number;
  overduePayablesCount?: number;
  pendingCollections?: number;
  pendingPayments?: number;
  advanceBalance?: { customer: number; supplier: number };
  creditLimitAlerts?: { companyId: string; companyName: string; reason: 'BLOCKED' | 'OVER_LIMIT'; outstanding: number | null; limit: number | null }[];
  customerOutstanding: { companyId: string; companyName: string; outstanding: number }[];
  supplierOutstanding: { supplierId: string; supplierName: string; outstanding: number }[];
  recentPayments: { id: string; paymentNumber: string; supplier: string; amount: number; paymentDate: string }[];
  recentReceipts: { id: string; receiptNumber: string; company: string; amount: number; receiptDate: string }[];
}

/**
 * Dashboard trend series (spec §3). There is deliberately no cash/bank
 * movement series — balances are a single running figure with no dated
 * transaction ledger behind them, so history cannot be reconstructed.
 */
export interface AccountsDashboardTrends {
  monthlyPerformance: { month: string; label: string; revenue: number; expenses: number; profit: number }[];
  upcomingEmiByMonth: { month: string; label: string; emiAmount: number; principal: number; interest: number; count: number }[];
}

export interface CreditControl {
  id: string;
  name: string;
  creditLimit: number | null;
  creditDays: number | null;
  isBlocked: boolean;
  blockedReason: string | null;
  blockedAt: string | null;
  liveOutstanding: number;
  /** How much of liveOutstanding was carried over from the previous system. */
  openingOutstanding?: number;
  currentOutstanding?: number;
}

export interface CollectionActivity {
  id: string;
  companyId: string;
  invoiceId: string | null;
  activityType: CollectionActivityType;
  notes: string | null;
  promisedAmount: number | null;
  promisedDate: string | null;
  followUpDate: string | null;
  createdAt: string;
  company?: { id: string; name: string };
  invoice?: { id: string; invoiceNumber: string } | null;
}

export type { PaginationMeta };
