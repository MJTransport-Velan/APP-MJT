import api from '../api';
import type { ApiResponse } from '@/types/api.types';
import type { BalanceSheetResult } from '@/types/balanceSheet.types';

export const balanceSheetApi = {
  get(asOfDate?: string) {
    return api.get<ApiResponse<BalanceSheetResult>>('/accounts/balance-sheet', { params: asOfDate ? { asOfDate } : {} });
  },
};
