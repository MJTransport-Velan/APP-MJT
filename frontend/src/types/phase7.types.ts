import type { PaginationMeta } from './admin.types';

// Profitability
export interface ProfitabilityRow {
  key: string;
  label: string;
  tripCount?: number;
  revenue: number;
  tripExpense?: number;
  supplierCharge?: number;
  driverCost?: number;
  expense?: number;
  profit: number;
}
export interface ProfitabilityResult {
  from: string;
  to: string;
  rows: ProfitabilityRow[];
}

// Outstanding / Loan / Expense
export interface OutstandingResult {
  rows: { driverId?: string; driverName?: string; driverCode?: string; employeeId?: string; employeeName?: string; employeeCode?: string; outstanding: number }[];
  total: number;
}

export interface ExpenseAnalysisResult {
  from: string;
  to: string;
  vehicleExpenseByCategory: { category: string; amount: number }[];
  totalVehicleExpense: number;
  driverCost: number;
  grandTotal: number;
}

// MIS Dashboard — direct-table aggregation only; no ledger-derived
// revenue/expense/netProfit/cashBalance/bankBalance/trend fields.
export interface MisDashboardSummary {
  outstanding: {
    customer: number;
    supplier: number;
    /** How much of the total was carried over from the previous system. */
    openingCustomer: number;
    openingSupplier: number;
  };
  vehicleCost: number;
  driverCost: number;
  topCustomers: { name: string; amount: number }[];
  topSuppliers: { name: string; amount: number }[];
}

// Audit Report — only userActivity survives the ledger removal
// (voucherAudit/ledgerAudit/deletedTransactions/modifiedTransactions/
// approvalHistory/backdatedEntries all read tables that no longer exist).
export interface UserActivityRow {
  id: string;
  user: string;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string | null;
  createdAt: string;
}

// Report Schedule
export type ReportFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
export type ReportFormat = 'PDF' | 'EXCEL' | 'CSV';
export interface ReportScheduleDefinition {
  id: string;
  name: string;
  reportKey: string;
  category: string;
  frequency: ReportFrequency;
  format: ReportFormat;
  recipientEmails: string | null;
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type { PaginationMeta };
