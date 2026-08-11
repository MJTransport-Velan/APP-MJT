export interface OperationsPerformance {
  intentsCreated: number;
  tripsCreated: number;
  tripsCompleted: number;
  tripsDelayed: number;
  tripsCancelled: number;
  revenueGenerated: number;
  onTimeDeliveryRate: number;
}

export interface AccountsPerformance {
  invoicesGenerated: number;
  totalInvoiceValue: number;
  receiptsCollected: number;
  totalCollected: number;
  supplierPaymentsProcessed: number;
  totalPaidToSuppliers: number;
}

export interface MyPerformanceSummary {
  operations: OperationsPerformance | null;
  accounts: AccountsPerformance | null;
}

export interface TeamPerformanceRow {
  userId: string;
  username: string;
  fullName: string;
  roles: string[];
  operations: OperationsPerformance | null;
  accounts: AccountsPerformance | null;
}

export type PerformanceTeamFilter = 'all' | 'operations' | 'accounts';
