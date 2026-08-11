import api from './api';
import type { ApiResponse } from '@/types/api.types';
import type { DashboardSummary } from '@/types/dashboard.types';

export const dashboardApi = {
  getSummary() {
    return api.get<ApiResponse<DashboardSummary>>('/dashboard');
  },
};
