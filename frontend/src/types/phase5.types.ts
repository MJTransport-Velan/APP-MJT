import type { PaginationMeta } from './admin.types';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type DriverAdvanceType =
  | 'SALARY_ADVANCE' | 'TRIP_ADVANCE' | 'EMERGENCY_ADVANCE' | 'FUEL_ADVANCE' | 'TOLL_ADVANCE'
  | 'REPAIR_ADVANCE' | 'MEDICAL_ADVANCE' | 'ADVANCE_AGAINST_SALARY' | 'ADVANCE_AGAINST_TRIP' | 'OTHER';
export type EmployeeAdvanceType = 'SALARY_ADVANCE' | 'EMERGENCY_ADVANCE' | 'MEDICAL_ADVANCE' | 'ADVANCE_AGAINST_SALARY' | 'OTHER';
export type DriverExpenseCategory = 'FUEL' | 'REPAIR' | 'TYRE' | 'BATTERY' | 'PARKING' | 'TOLL' | 'FOOD' | 'ACCOMMODATION' | 'MEDICAL' | 'PHONE' | 'MISCELLANEOUS';
export type DriverEarningCategory = 'ALLOWANCE' | 'INCENTIVE';
export type DriverEarningType =
  | 'TRIP_BATA' | 'DAILY_BATA' | 'NIGHT_BATA' | 'LOADING_ALLOWANCE' | 'UNLOADING_ALLOWANCE' | 'WAITING_CHARGES'
  | 'OUTSTATION_ALLOWANCE' | 'FOOD_ALLOWANCE' | 'SPECIAL_ALLOWANCE' | 'TRIP_INCENTIVE' | 'MONTHLY_INCENTIVE'
  | 'FUEL_SAVING_INCENTIVE' | 'ON_TIME_DELIVERY_INCENTIVE' | 'PERFORMANCE_BONUS' | 'TARGET_INCENTIVE'
  | 'FESTIVAL_BONUS' | 'REFERRAL_BONUS' | 'CUSTOM';
export type EarningCalculationType = 'FIXED_PER_TRIP' | 'PER_KM' | 'PER_DAY' | 'PERCENT_OF_FREIGHT';
export type DriverPenaltyType =
  | 'FUEL_RECOVERY' | 'DAMAGE_RECOVERY' | 'ACCIDENT_RECOVERY' | 'LATE_DELIVERY_PENALTY' | 'TRAFFIC_FINE'
  | 'ADVANCE_RECOVERY' | 'LOAN_RECOVERY' | 'UNIFORM_RECOVERY' | 'OTHER';
export type DriverLoanType = 'PERSONAL' | 'EMERGENCY' | 'VEHICLE' | 'FESTIVAL' | 'MEDICAL';
export type EmployeeLoanType = 'PERSONAL' | 'EMERGENCY' | 'FESTIVAL' | 'MEDICAL';
export type LoanStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'CLOSED' | 'REJECTED' | 'WRITTEN_OFF';
export type LoanInstallmentStatus = 'PENDING' | 'RECOVERED' | 'WAIVED';
export type DriverSettlementType = 'PARTIAL' | 'FINAL' | 'EXIT' | 'YEAR_END';
export type DriverSettlementStatus = 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'PAID';
export type SettlementLineSourceType = 'ADVANCE' | 'ALLOWANCE' | 'INCENTIVE' | 'REIMBURSEMENT' | 'PENALTY' | 'LOAN_INSTALLMENT' | 'SALARY';
export type LineDirection = 'DEBIT' | 'CREDIT';
export type SalaryComponentType =
  | 'BASIC' | 'HRA' | 'DA' | 'SPECIAL_ALLOWANCE' | 'TRAVEL_ALLOWANCE' | 'MEDICAL_ALLOWANCE' | 'PF' | 'ESI'
  | 'PROFESSIONAL_TAX' | 'TDS' | 'OTHER_DEDUCTION' | 'BONUS' | 'ARREARS' | 'LEAVE_DEDUCTION'
  | 'ATTENDANCE_DEDUCTION' | 'OVERTIME' | 'RECOVERY' | 'MANUAL_ADJUSTMENT' | 'CUSTOM';
export type SalaryCalculationType = 'FIXED_AMOUNT' | 'PERCENT_OF_BASIC' | 'PERCENT_OF_GROSS';
export type PayrollPeriodType = 'MONTHLY' | 'WEEKLY' | 'DAILY_WAGE' | 'CONTRACT';
export type PayrollRunType = 'REGULAR' | 'FINAL_SETTLEMENT' | 'EXIT';
export type PayrollRunStatus = 'DRAFT' | 'CALCULATED' | 'VERIFIED' | 'APPROVED' | 'PROCESSED' | 'PAID' | 'CANCELLED';

export interface DriverRef {
  id: string;
  name: string;
  code: string;
}

export interface EmployeeRef {
  id: string;
  name: string;
  employeeCode: string;
}

export interface DriverAdvance {
  id: string;
  advanceNumber: string;
  advanceType: DriverAdvanceType;
  purpose: string | null;
  amount: number;
  approvalStatus: ApprovalStatus;
  isSettled: boolean;
  settlementId: string | null;
  driver: DriverRef;
  trip: { id: string; tripNumber: string } | null;
  vehicle: { id: string; registrationNumber: string } | null;
  paymentMode: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface DriverExpenseReimbursement {
  id: string;
  reimbursementNumber: string;
  category: DriverExpenseCategory;
  amount: number;
  expenseDate: string;
  description: string | null;
  receiptDocument: string | null;
  approvalStatus: ApprovalStatus;
  isSettled: boolean;
  settlementId: string | null;
  driver: DriverRef;
  trip: { id: string; tripNumber: string } | null;
  vehicle: { id: string; registrationNumber: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface DriverEarning {
  id: string;
  earningNumber: string;
  earningCategory: DriverEarningCategory;
  earningType: DriverEarningType;
  name: string | null;
  amount: number;
  approvalStatus: ApprovalStatus;
  isSettled: boolean;
  settlementId: string | null;
  driver: DriverRef;
  trip: { id: string; tripNumber: string } | null;
  rule: { id: string; calculationType: EarningCalculationType; value: number } | null;
  createdAt: string;
  updatedAt: string;
}

export interface DriverEarningRule {
  id: string;
  earningCategory: DriverEarningCategory;
  earningType: DriverEarningType;
  calculationType: EarningCalculationType;
  value: number;
  vehicleTypeId: string | null;
  routeId: string | null;
  isActive: boolean;
}

export interface DriverPenalty {
  id: string;
  penaltyNumber: string;
  penaltyType: DriverPenaltyType;
  amount: number;
  reason: string;
  approvalStatus: ApprovalStatus;
  isSettled: boolean;
  settlementId: string | null;
  driver: DriverRef;
  trip: { id: string; tripNumber: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoanInstallment {
  id: string;
  installmentNo: number;
  dueDate: string;
  emiAmount: number;
  status: LoanInstallmentStatus;
  recoveredSettlementId?: string | null;
}

export interface DriverLoan {
  id: string;
  loanNumber: string;
  loanType: DriverLoanType;
  principalAmount: number;
  tenureMonths: number;
  emiAmount: number;
  interestRate: number;
  status: LoanStatus;
  outstandingPrincipal: number;
  driver: DriverRef;
  installments: LoanInstallment[];
  createdAt: string;
  updatedAt: string;
}

export interface DriverSettlementLine {
  id: string;
  sourceType: SettlementLineSourceType;
  sourceId: string | null;
  description: string;
  amount: number;
  direction: LineDirection;
}

export interface DriverSettlement {
  id: string;
  settlementNumber: string;
  settlementType: DriverSettlementType;
  periodStart: string;
  periodEnd: string;
  status: DriverSettlementStatus;
  grossEarnings: number;
  totalDeductions: number;
  netPayable: number;
  driver: DriverRef;
  lines: DriverSettlementLine[];
  createdAt: string;
  updatedAt: string;
}

export interface DriverSettlementPreview {
  grossEarnings: number;
  totalDeductions: number;
  netPayable: number;
  lines: { sourceType: SettlementLineSourceType; sourceId: string; description: string; amount: number; direction: LineDirection }[];
}

export interface DriverStatementTransaction {
  advanceNumber: string;
  date: string;
  narration: string;
  debitAmount: number;
  creditAmount: number;
  isSettled: boolean;
  runningBalance: number;
}

export interface DriverStatement {
  driver: DriverRef;
  openingBalance: number;
  closingBalance: number;
  transactions: DriverStatementTransaction[];
}

export interface SalaryStructureComponent {
  id: string;
  componentType: SalaryComponentType;
  name: string | null;
  calculationType: SalaryCalculationType;
  value: number;
  isEarning: boolean;
}

export interface SalaryStructure {
  id: string;
  employeeId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  employee: EmployeeRef;
  components: SalaryStructureComponent[];
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeAdvance {
  id: string;
  advanceNumber: string;
  advanceType: EmployeeAdvanceType;
  purpose: string | null;
  amount: number;
  approvalStatus: ApprovalStatus;
  isSettled: boolean;
  employee: EmployeeRef;
  paymentMode: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeLoan {
  id: string;
  loanNumber: string;
  loanType: EmployeeLoanType;
  principalAmount: number;
  tenureMonths: number;
  emiAmount: number;
  status: LoanStatus;
  outstandingPrincipal: number;
  employee: EmployeeRef;
  installments: LoanInstallment[];
  createdAt: string;
  updatedAt: string;
}

export interface PayrollRunLineComponentRow {
  componentType: SalaryComponentType;
  name: string | null;
  amount: number;
  isEarning: boolean;
}

export interface PayrollRunLine {
  id: string;
  employee: EmployeeRef;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  components: PayrollRunLineComponentRow[];
}

export interface PayrollRun {
  id: string;
  runNumber: string;
  periodType: PayrollPeriodType;
  periodStart: string;
  periodEnd: string;
  runType: PayrollRunType;
  status: PayrollRunStatus;
  lines: PayrollRunLine[];
  createdAt: string;
  updatedAt: string;
}

export interface PayrollDashboardSummary {
  pendingPayrollRuns: number;
  pendingAdvances: number;
  pendingDriverAdvances: number;
  pendingEmployeeAdvances: number;
  pendingSettlements: number;
  pendingLoans: number;
  pendingDriverLoans: number;
  pendingEmployeeLoans: number;
  outstandingDriverAdvances: number;
  outstandingEmployeeAdvances: number;
  outstandingDriverLoans: number;
  outstandingEmployeeLoans: number;
  todaysPayments: number;
}

export type { PaginationMeta };
