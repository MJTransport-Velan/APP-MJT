import api from '../api';
import { createMasterApi } from '../masterApiFactory';
import type { ApiResponse } from '@/types/api.types';
import type { Organization, ExchangeRate, PaginationMeta } from '@/types/accounting.types';

export const organizationApi = {
  ...createMasterApi<Organization>('/accounting/organizations'),
};

export const exchangeRateApi = {
  list(currencyId: string) {
    return api.get<ApiResponse<ExchangeRate[]>>('/accounting/exchange-rates', { params: { currencyId } });
  },
  create(payload: Record<string, unknown>) {
    return api.post<ApiResponse<ExchangeRate>>('/accounting/exchange-rates', payload);
  },
  update(id: string, payload: Record<string, unknown>) {
    return api.put<ApiResponse<ExchangeRate>>(`/accounting/exchange-rates/${id}`, payload);
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/accounting/exchange-rates/${id}`);
  },
};

export type { PaginationMeta };
