import api from './api';
import type { ApiResponse } from '@/types/api.types';
import type { DashboardSummary } from '@/types/dashboard.types';

export const dashboardApi = {
  getSummary(params: Record<string, string> = {}) {
    return api.get<ApiResponse<DashboardSummary>>('/dashboard', { params });
  },
};
