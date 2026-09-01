import { defineStore } from 'pinia';
import { dashboardApi } from '@/services/dashboard.service';
import type { DashboardSummary } from '@/types/dashboard.types';

interface DashboardState {
  summary: DashboardSummary | null;
  loading: boolean;
  error: string | null;
}

export const useDashboardStore = defineStore('dashboard', {
  state: (): DashboardState => ({
    summary: null,
    loading: false,
    error: null,
  }),

  actions: {
    async fetchSummary(params: Record<string, string> = {}) {
      this.loading = true;
      this.error = null;
      try {
        const response = await dashboardApi.getSummary(params);
        this.summary = response.data.data;
      } catch (err) {
        this.error = 'Failed to load dashboard data';
      } finally {
        this.loading = false;
      }
    },
  },
});
