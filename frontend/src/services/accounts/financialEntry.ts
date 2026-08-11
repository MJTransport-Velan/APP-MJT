import api from '../api';
import type { ApiResponse } from '@/types/api.types';
import type { PaginationMeta } from '@/types/admin.types';
import type { FinancialEntry, CreateFinancialEntryInput, BankAndCashState, FinancialDashboardSummary } from '@/types/financialEntry.types';

export const financialEntryApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<FinancialEntry[]> & { meta: PaginationMeta }>('/accounts/financial-entries', { params });
  },
  getById(id: string) {
    return api.get<ApiResponse<FinancialEntry>>(`/accounts/financial-entries/${id}`);
  },
  create(payload: CreateFinancialEntryInput) {
    return api.post<ApiResponse<FinancialEntry>>('/accounts/financial-entries', payload);
  },
  cancel(id: string, reason: string) {
    return api.post<ApiResponse<FinancialEntry>>(`/accounts/financial-entries/${id}/cancel`, { reason });
  },
  reverse(id: string, reason?: string) {
    return api.post<ApiResponse<FinancialEntry>>(`/accounts/financial-entries/${id}/reverse`, { reason });
  },
  correct(id: string, payload: CreateFinancialEntryInput) {
    return api.post<ApiResponse<FinancialEntry>>(`/accounts/financial-entries/${id}/correct`, payload);
  },
};

export const financialStateApi = {
  dashboard(params: { from?: string; to?: string } = {}) {
    return api.get<ApiResponse<FinancialDashboardSummary>>('/accounts/financial-state/dashboard', { params });
  },
  bankAndCash() {
    return api.get<ApiResponse<BankAndCashState>>('/accounts/financial-state/bank-cash');
  },
};
