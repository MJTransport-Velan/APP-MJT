import api from '../api';
import type { ApiResponse } from '@/types/api.types';
import type {
  DriverAdvance,
  DriverExpenseReimbursement,
  DriverEarning,
  DriverEarningRule,
  DriverPenalty,
  DriverLoan,
  DriverSettlement,
  DriverSettlementPreview,
  DriverStatement,
  SalaryStructure,
  EmployeeAdvance,
  EmployeeLoan,
  PayrollRun,
  PayrollDashboardSummary,
  PaginationMeta,
} from '@/types/phase5.types';

export const driverAdvanceApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<DriverAdvance[]> & { meta: PaginationMeta }>('/accounts/driver/advances', { params });
  },
  getById(id: string) {
    return api.get<ApiResponse<DriverAdvance>>(`/accounts/driver/advances/${id}`);
  },
  request(payload: Record<string, unknown>) {
    return api.post<ApiResponse<DriverAdvance>>('/accounts/driver/advances', payload);
  },
  approve(id: string) {
    return api.patch<ApiResponse<DriverAdvance>>(`/accounts/driver/advances/${id}/approve`);
  },
  reject(id: string, reason?: string) {
    return api.patch<ApiResponse<DriverAdvance>>(`/accounts/driver/advances/${id}/reject`, { reason });
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/accounts/driver/advances/${id}`);
  },
};

export const driverReimbursementApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<DriverExpenseReimbursement[]> & { meta: PaginationMeta }>('/accounts/driver/reimbursements', { params });
  },
  request(payload: Record<string, unknown>) {
    return api.post<ApiResponse<DriverExpenseReimbursement>>('/accounts/driver/reimbursements', payload);
  },
  approve(id: string) {
    return api.patch<ApiResponse<DriverExpenseReimbursement>>(`/accounts/driver/reimbursements/${id}/approve`);
  },
  reject(id: string, reason?: string) {
    return api.patch<ApiResponse<DriverExpenseReimbursement>>(`/accounts/driver/reimbursements/${id}/reject`, { reason });
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/accounts/driver/reimbursements/${id}`);
  },
};

export const driverEarningApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<DriverEarning[]> & { meta: PaginationMeta }>('/accounts/driver/earnings', { params });
  },
  create(payload: Record<string, unknown>) {
    return api.post<ApiResponse<DriverEarning>>('/accounts/driver/earnings', payload);
  },
  approve(id: string) {
    return api.patch<ApiResponse<DriverEarning>>(`/accounts/driver/earnings/${id}/approve`);
  },
  reject(id: string, reason?: string) {
    return api.patch<ApiResponse<DriverEarning>>(`/accounts/driver/earnings/${id}/reject`, { reason });
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/accounts/driver/earnings/${id}`);
  },
  listRules() {
    return api.get<ApiResponse<DriverEarningRule[]>>('/accounts/driver/earnings/rules');
  },
  createRule(payload: Record<string, unknown>) {
    return api.post<ApiResponse<DriverEarningRule>>('/accounts/driver/earnings/rules', payload);
  },
  removeRule(id: string) {
    return api.delete<ApiResponse<null>>(`/accounts/driver/earnings/rules/${id}`);
  },
};

export const driverPenaltyApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<DriverPenalty[]> & { meta: PaginationMeta }>('/accounts/driver/penalties', { params });
  },
  request(payload: Record<string, unknown>) {
    return api.post<ApiResponse<DriverPenalty>>('/accounts/driver/penalties', payload);
  },
  approve(id: string) {
    return api.patch<ApiResponse<DriverPenalty>>(`/accounts/driver/penalties/${id}/approve`);
  },
  reject(id: string, reason?: string) {
    return api.patch<ApiResponse<DriverPenalty>>(`/accounts/driver/penalties/${id}/reject`, { reason });
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/accounts/driver/penalties/${id}`);
  },
};

export const driverLoanApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<DriverLoan[]> & { meta: PaginationMeta }>('/accounts/driver/loans', { params });
  },
  request(payload: Record<string, unknown>) {
    return api.post<ApiResponse<DriverLoan>>('/accounts/driver/loans', payload);
  },
  approve(id: string) {
    return api.patch<ApiResponse<DriverLoan>>(`/accounts/driver/loans/${id}/approve`);
  },
  reject(id: string, reason?: string) {
    return api.patch<ApiResponse<DriverLoan>>(`/accounts/driver/loans/${id}/reject`, { reason });
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/accounts/driver/loans/${id}`);
  },
};

export const driverSettlementApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<DriverSettlement[]> & { meta: PaginationMeta }>('/accounts/driver/settlements', { params });
  },
  getById(id: string) {
    return api.get<ApiResponse<DriverSettlement>>(`/accounts/driver/settlements/${id}`);
  },
  preview(driverId: string, periodStart: string, periodEnd: string) {
    return api.get<ApiResponse<DriverSettlementPreview>>('/accounts/driver/settlements/preview', { params: { driverId, periodStart, periodEnd } });
  },
  create(payload: Record<string, unknown>) {
    return api.post<ApiResponse<DriverSettlement>>('/accounts/driver/settlements', payload);
  },
  calculate(id: string) {
    return api.patch<ApiResponse<DriverSettlement>>(`/accounts/driver/settlements/${id}/calculate`);
  },
  approve(id: string) {
    return api.patch<ApiResponse<DriverSettlement>>(`/accounts/driver/settlements/${id}/approve`);
  },
  pay(id: string) {
    return api.patch<ApiResponse<DriverSettlement>>(`/accounts/driver/settlements/${id}/pay`);
  },
  revert(id: string) {
    return api.patch<ApiResponse<DriverSettlement>>(`/accounts/driver/settlements/${id}/revert`);
  },
};

export const driverStatementApi = {
  get(driverId: string, from?: string, to?: string) {
    return api.get<ApiResponse<DriverStatement>>(`/accounts/driver/${driverId}/statement`, { params: { from, to } });
  },
};

export const salaryStructureApi = {
  listForEmployee(employeeId: string) {
    return api.get<ApiResponse<SalaryStructure[]>>(`/accounts/payroll/salary-structures/employee/${employeeId}`);
  },
  getActiveForEmployee(employeeId: string) {
    return api.get<ApiResponse<SalaryStructure>>(`/accounts/payroll/salary-structures/employee/${employeeId}/active`);
  },
  create(payload: Record<string, unknown>) {
    return api.post<ApiResponse<SalaryStructure>>('/accounts/payroll/salary-structures', payload);
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/accounts/payroll/salary-structures/${id}`);
  },
};

export const employeeAdvanceApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<EmployeeAdvance[]> & { meta: PaginationMeta }>('/accounts/payroll/advances', { params });
  },
  request(payload: Record<string, unknown>) {
    return api.post<ApiResponse<EmployeeAdvance>>('/accounts/payroll/advances', payload);
  },
  approve(id: string) {
    return api.patch<ApiResponse<EmployeeAdvance>>(`/accounts/payroll/advances/${id}/approve`);
  },
  reject(id: string, reason?: string) {
    return api.patch<ApiResponse<EmployeeAdvance>>(`/accounts/payroll/advances/${id}/reject`, { reason });
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/accounts/payroll/advances/${id}`);
  },
};

export const employeeLoanApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<EmployeeLoan[]> & { meta: PaginationMeta }>('/accounts/payroll/loans', { params });
  },
  request(payload: Record<string, unknown>) {
    return api.post<ApiResponse<EmployeeLoan>>('/accounts/payroll/loans', payload);
  },
  approve(id: string) {
    return api.patch<ApiResponse<EmployeeLoan>>(`/accounts/payroll/loans/${id}/approve`);
  },
  reject(id: string, reason?: string) {
    return api.patch<ApiResponse<EmployeeLoan>>(`/accounts/payroll/loans/${id}/reject`, { reason });
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/accounts/payroll/loans/${id}`);
  },
};

export const payrollRunApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<PayrollRun[]> & { meta: PaginationMeta }>('/accounts/payroll/runs', { params });
  },
  getById(id: string) {
    return api.get<ApiResponse<PayrollRun>>(`/accounts/payroll/runs/${id}`);
  },
  create(payload: Record<string, unknown>) {
    return api.post<ApiResponse<PayrollRun>>('/accounts/payroll/runs', payload);
  },
  calculate(id: string, employeeIds?: string[]) {
    return api.patch<ApiResponse<PayrollRun>>(`/accounts/payroll/runs/${id}/calculate`, { employeeIds });
  },
  verify(id: string) {
    return api.patch<ApiResponse<PayrollRun>>(`/accounts/payroll/runs/${id}/verify`);
  },
  approve(id: string) {
    return api.patch<ApiResponse<PayrollRun>>(`/accounts/payroll/runs/${id}/approve`);
  },
  process(id: string) {
    return api.patch<ApiResponse<PayrollRun>>(`/accounts/payroll/runs/${id}/process`);
  },
  pay(id: string) {
    return api.patch<ApiResponse<PayrollRun>>(`/accounts/payroll/runs/${id}/pay`);
  },
  cancel(id: string) {
    return api.patch<ApiResponse<PayrollRun>>(`/accounts/payroll/runs/${id}/cancel`);
  },
  revert(id: string) {
    return api.patch<ApiResponse<PayrollRun>>(`/accounts/payroll/runs/${id}/revert`);
  },
};

export const payrollDashboardApi = {
  getSummary() {
    return api.get<ApiResponse<PayrollDashboardSummary>>('/accounts/payroll/dashboard');
  },
};
