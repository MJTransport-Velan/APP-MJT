import api from '../api';
import type { ApiResponse } from '@/types/api.types';
import type {
  DriverAdvance,
  DriverEarning,
  DriverEarningRule,
  DriverPenalty,
  DriverSettlement,
  DriverSettlementPreview,
  DriverStatement,
  SalaryStructure,
  DriverSalaryStructure,
  EmployeeAdvance,
  EmployeeSalaryPayment,
  DriverSalaryPayment,
  SalaryQuote,
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

export const driverSalaryStructureApi = {
  listForDriver(driverId: string) {
    return api.get<ApiResponse<DriverSalaryStructure[]>>(`/accounts/driver/salary-structures/driver/${driverId}`);
  },
  getActiveForDriver(driverId: string) {
    return api.get<ApiResponse<DriverSalaryStructure | null>>(`/accounts/driver/salary-structures/driver/${driverId}/active`);
  },
  create(payload: Record<string, unknown>) {
    return api.post<ApiResponse<DriverSalaryStructure>>('/accounts/driver/salary-structures', payload);
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/accounts/driver/salary-structures/${id}`);
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

export const employeeSalaryPaymentApi = {
  listForEmployee(employeeId: string) {
    return api.get<ApiResponse<EmployeeSalaryPayment[]>>(`/accounts/payroll/salary-payments/employee/${employeeId}`);
  },
};

export const driverSalaryPaymentApi = {
  listForDriver(driverId: string) {
    return api.get<ApiResponse<DriverSalaryPayment[]>>(`/accounts/driver/salary-payments/${driverId}`);
  },
};

export const salaryPaymentQuoteApi = {
  employeeQuote(employeeId: string, period: string) {
    return api.get<ApiResponse<SalaryQuote>>(`/accounts/payroll/salary-quote/employee/${employeeId}`, { params: { period } });
  },
  driverQuote(driverId: string, period: string) {
    return api.get<ApiResponse<SalaryQuote>>(`/accounts/payroll/salary-quote/driver/${driverId}`, { params: { period } });
  },
};

export const payrollDashboardApi = {
  getSummary() {
    return api.get<ApiResponse<PayrollDashboardSummary>>('/accounts/payroll/dashboard');
  },
};
