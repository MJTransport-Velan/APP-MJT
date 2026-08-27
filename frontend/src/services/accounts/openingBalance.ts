import api from '../api';
import type { ApiResponse } from '@/types/api.types';
import type {
  FinancialMigration,
  OpeningBalanceEntry,
  OpeningBalanceListResult,
  MigrationSummary,
} from '@/types/openingBalance.types';

export const openingBalanceApi = {
  getMigration() {
    return api.get<ApiResponse<FinancialMigration | null>>('/accounts/opening-balance/migration');
  },
  saveMigration(payload: Record<string, unknown>) {
    return api.post<ApiResponse<FinancialMigration>>('/accounts/opening-balance/migration', payload);
  },
  // Finalizing locks the opening figures; reopening unlocks them again.
  finalize() {
    return api.post<ApiResponse<FinancialMigration>>('/accounts/opening-balance/finalize');
  },
  reopen() {
    return api.post<ApiResponse<FinancialMigration>>('/accounts/opening-balance/reopen');
  },
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<OpeningBalanceListResult>>('/accounts/opening-balance', { params });
  },
  summary() {
    return api.get<ApiResponse<MigrationSummary>>('/accounts/opening-balance/summary');
  },
  create(payload: Record<string, unknown>) {
    return api.post<ApiResponse<OpeningBalanceEntry>>('/accounts/opening-balance', payload);
  },
  update(id: string, payload: Record<string, unknown>) {
    return api.put<ApiResponse<OpeningBalanceEntry>>(`/accounts/opening-balance/${id}`, payload);
  },
  // Moves owner money between capital and loan after the fact — the whole
  // point of letting an opening owner amount stay undecided.
  reclassify(id: string, payload: Record<string, unknown>) {
    return api.patch<ApiResponse<OpeningBalanceEntry>>(`/accounts/opening-balance/${id}/reclassify`, payload);
  },
  setStatus(id: string, status: string) {
    return api.patch<ApiResponse<OpeningBalanceEntry>>(`/accounts/opening-balance/${id}/status`, { status });
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/accounts/opening-balance/${id}`);
  },
};
