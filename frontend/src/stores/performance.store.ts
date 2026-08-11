import { defineStore } from 'pinia';
import { performanceApi } from '@/services/performance.service';
import type { PerformanceDateFilters, TeamPerformanceParams } from '@/services/performance.service';
import type { MyPerformanceSummary, TeamPerformanceRow } from '@/types/performance.types';
import type { PaginationMeta } from '@/types/admin.types';

export const useMyPerformanceStore = defineStore('myPerformance', {
  state: () => ({
    summary: null as MyPerformanceSummary | null,
    loading: false,
  }),

  actions: {
    async fetchSummary(filters: PerformanceDateFilters = {}) {
      this.loading = true;
      try {
        const response = await performanceApi.getMine(filters);
        this.summary = response.data.data;
      } finally {
        this.loading = false;
      }
    },
  },
});

export const useTeamPerformanceStore = defineStore('teamPerformance', {
  state: () => ({
    rows: [] as TeamPerformanceRow[],
    meta: null as PaginationMeta | null,
    loading: false,
  }),

  actions: {
    async fetch(params: TeamPerformanceParams) {
      this.loading = true;
      try {
        const response = await performanceApi.getTeam(params);
        this.rows = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
  },
});
