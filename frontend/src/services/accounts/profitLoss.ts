import api from '../api';
import type { ApiResponse } from '@/types/api.types';
import type { ProfitLossResult } from '@/types/profitLoss.types';

export const profitLossApi = {
  get(from?: string, to?: string) {
    return api.get<ApiResponse<ProfitLossResult>>('/accounts/profit-loss', { params: { from, to } });
  },
};
