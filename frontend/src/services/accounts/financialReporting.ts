import api from '../api';
import type { ApiResponse } from '@/types/api.types';
import type {
  ProfitabilityResult,
  OutstandingResult,
  LoanReportResult,
  ExpenseAnalysisResult,
  MisDashboardSummary,
  UserActivityRow,
  ReportScheduleDefinition,
  PaginationMeta,
} from '@/types/phase7.types';

export const profitabilityReportApi = {
  customer(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<ProfitabilityResult>>('/accounts/profitability-reports/customer', { params });
  },
  supplier(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<ProfitabilityResult>>('/accounts/profitability-reports/supplier', { params });
  },
  vehicle(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<ProfitabilityResult>>('/accounts/profitability-reports/vehicle', { params });
  },
  driver(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<ProfitabilityResult>>('/accounts/profitability-reports/driver', { params });
  },
  route(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<ProfitabilityResult>>('/accounts/profitability-reports/route', { params });
  },
};

export const outstandingReportApi = {
  driver() {
    return api.get<ApiResponse<OutstandingResult>>('/accounts/outstanding-reports/driver');
  },
  employee() {
    return api.get<ApiResponse<OutstandingResult>>('/accounts/outstanding-reports/employee');
  },
};

export const loanReportApi = {
  summary(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<LoanReportResult>>('/accounts/loan-reports/summary', { params });
  },
};

export const expenseAnalysisApi = {
  analyze(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<ExpenseAnalysisResult>>('/accounts/expense-analysis', { params });
  },
};

export const misDashboardApi = {
  get() {
    return api.get<ApiResponse<MisDashboardSummary>>('/accounts/mis-dashboard');
  },
};

export const auditReportApi = {
  userActivity(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<UserActivityRow[]> & { meta: PaginationMeta }>('/accounts/audit-reports/user-activity', { params });
  },
};

export const reportScheduleApi = {
  list(isActive?: boolean, category?: string) {
    return api.get<ApiResponse<ReportScheduleDefinition[]>>('/accounts/report-schedules', { params: { isActive, category } });
  },
  create(payload: Record<string, unknown>) {
    return api.post<ApiResponse<ReportScheduleDefinition>>('/accounts/report-schedules', payload);
  },
  update(id: string, payload: Record<string, unknown>) {
    return api.put<ApiResponse<ReportScheduleDefinition>>(`/accounts/report-schedules/${id}`, payload);
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/accounts/report-schedules/${id}`);
  },
};
