import api from '../api';
import type { ApiResponse } from '@/types/api.types';
import type { PaginationMeta } from '@/types/phase6.types';
import type { FuelCardAccount, FuelCardAccountSummary, FuelCardTransaction } from '@/types/fuelCard.types';

// The diesel card account is a fleet-wide singleton — no account id in any
// of these paths, and no card id either: every card spends the one balance.
// There is deliberately no `logUsage` here; a drawdown is created by
// recording the fuel entry that was billed to a card.
export const fuelCardAccountApi = {
  getAccount() {
    return api.get<ApiResponse<FuelCardAccount>>('/accounts/fuel-card-account/account');
  },
  summary() {
    return api.get<ApiResponse<FuelCardAccountSummary>>('/accounts/fuel-card-account/account/summary');
  },
  listTransactions(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<FuelCardTransaction[]> & { meta: PaginationMeta }>('/accounts/fuel-card-account/transactions', { params });
  },
  recharge(payload: Record<string, unknown>) {
    return api.post<ApiResponse<FuelCardAccount>>('/accounts/fuel-card-account/recharge', payload);
  },
  refund(payload: Record<string, unknown>) {
    return api.post<ApiResponse<FuelCardAccount>>('/accounts/fuel-card-account/refund', payload);
  },
  adjust(payload: Record<string, unknown>) {
    return api.post<ApiResponse<FuelCardAccount>>('/accounts/fuel-card-account/adjust', payload);
  },
  updateTransaction(transactionId: string, payload: Record<string, unknown>) {
    return api.patch<ApiResponse<FuelCardTransaction>>(`/accounts/fuel-card-account/transactions/${transactionId}`, payload);
  },
  removeTransaction(transactionId: string) {
    return api.delete<ApiResponse<null>>(`/accounts/fuel-card-account/transactions/${transactionId}`);
  },
};
