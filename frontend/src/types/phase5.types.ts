import type { PaginationMeta } from './admin.types';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type DriverAdvanceType =
  | 'SALARY_ADVANCE' | 'TRIP_ADVANCE' | 'EMERGENCY_ADVANCE' | 'FUEL_ADVANCE' | 'TOLL_ADVANCE'
  | 'REPAIR_ADVANCE' | 'MEDICAL_ADVANCE' | 'ADVANCE_AGAINST_SALARY' | 'ADVANCE_AGAINST_TRIP' | 'OTHER';
export type EmployeeAdvanceType = 'SALARY_ADVANCE' | 'EMERGENCY_ADVANCE' | 'MEDICAL_ADVANCE' | 'ADVANCE_AGAINST_SALARY' | 'OTHER';
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
export type DriverSettlementType = 'PARTIAL' | 'FINAL' | 'EXIT' | 'YEAR_END';
export type DriverSettlementStatus = 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'PAID';
export type SettlementLineSourceType = 'ADVANCE' | 'ALLOWANCE' | 'INCENTIVE' | 'PENALTY' | 'SALARY';
export type LineDirection = 'DEBIT' | 'CREDIT';
export type SalaryComponentType =
  | 'BASIC' | 'HRA' | 'DA' | 'SPECIAL_ALLOWANCE' | 'TRAVEL_ALLOWANCE' | 'MEDICAL_ALLOWANCE' | 'PF' | 'ESI'
  | 'PROFESSIONAL_TAX' | 'TDS' | 'OTHER_DEDUCTION' | 'BONUS' | 'ARREARS' | 'LEAVE_DEDUCTION'
  | 'ATTENDANCE_DEDUCTION' | 'OVERTIME' | 'RECOVERY' | 'MANUAL_ADJUSTMENT' | 'CUSTOM';
export type SalaryCalculationType = 'FIXED_AMOUNT' | 'PERCENT_OF_BASIC' | 'PERCENT_OF_GROSS';

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

export interface DriverVehicleAssignmentSummary {
  vehicleId: string;
  registrationNumber: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  assignedAt: string;
  unassignedAt: string | null;
}

export interface DriverStatement {
  driver: DriverRef;
  openingBalance: number;
  closingBalance: number;
  transactions: DriverStatementTransaction[];
  currentVehicle: { vehicleId: string; registrationNumber: string; assignedAt: string } | null;
  vehicleHistory: DriverVehicleAssignmentSummary[];
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

export type DriverSalaryType = 'FIXED' | 'PERCENT_OF_FREIGHT';

export interface DriverSalaryStructure {
  id: string;
  driverId: string;
  salaryType: DriverSalaryType;
  fixedAmount: number | null;
  percentValue: number | null;
  effectiveFrom: string;
  isActive: boolean;
  driver: DriverRef;
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


export interface EmployeeSalaryPayment {
  id: string;
  employeeId: string;
  year: number;
  month: number;
  amount: number;
  paidDate: string;
  createdAt: string;
}

export interface DriverSalaryPayment {
  id: string;
  driverId: string;
  year: number;
  month: number;
  amount: number;
  paidDate: string;
  createdAt: string;
}

export interface SalaryQuoteAdvance {
  id: string;
  number: string;
  amount: number;
  date: string;
}

export interface SalaryQuote {
  party: { id: string; name: string; code: string; designation: string | null };
  structureAmount: number | null;
  advances: SalaryQuoteAdvance[];
  advanceTotal: number;
  netAmount: number | null;
  alreadyPaid: boolean;
}

export interface PayrollDashboardSummary {
  pendingAdvances: number;
  pendingDriverAdvances: number;
  pendingEmployeeAdvances: number;
  pendingSettlements: number;
  outstandingDriverAdvances: number;
  outstandingEmployeeAdvances: number;
  todaysPayments: number;
}

export type { PaginationMeta };
