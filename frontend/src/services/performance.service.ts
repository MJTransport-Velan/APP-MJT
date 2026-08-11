import api from './api';
import type { ApiResponse } from '@/types/api.types';
import type { PaginationMeta } from '@/types/admin.types';
import type { MyPerformanceSummary, TeamPerformanceRow, PerformanceTeamFilter } from '@/types/performance.types';

export interface PerformanceDateFilters {
  dateFrom?: string;
  dateTo?: string;
}

export interface TeamPerformanceParams extends PerformanceDateFilters {
  team?: PerformanceTeamFilter;
  search?: string;
  page?: number;
  pageSize?: number;
}

export const performanceApi = {
  getMine(params: PerformanceDateFilters = {}) {
    return api.get<ApiResponse<MyPerformanceSummary>>('/performance/me', { params });
  },
  getTeam(params: TeamPerformanceParams) {
    return api.get<ApiResponse<TeamPerformanceRow[]> & { meta: PaginationMeta }>('/performance/team', { params });
  },
};
