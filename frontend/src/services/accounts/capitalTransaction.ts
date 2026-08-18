import api from '../api';
import type { ApiResponse } from '@/types/api.types';
import type { PaginationMeta } from '@/types/admin.types';
import type { CapitalTransaction, CreateCapitalTransactionInput, CapitalPartnerState } from '@/types/capitalTransaction.types';

export const capitalTransactionApi = {
  list(params: Record<string, unknown> = {}) {
    return api.get<ApiResponse<CapitalTransaction[]> & { meta: PaginationMeta }>('/accounts/capital-transactions', { params });
  },
  getById(id: string) {
    return api.get<ApiResponse<CapitalTransaction>>(`/accounts/capital-transactions/${id}`);
  },
  create(payload: CreateCapitalTransactionInput) {
    return api.post<ApiResponse<CapitalTransaction>>('/accounts/capital-transactions', payload);
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/accounts/capital-transactions/${id}`);
  },
  partnerState(partnerId: string) {
    return api.get<ApiResponse<CapitalPartnerState>>(`/accounts/capital-transactions/partner/${partnerId}`);
  },
};
