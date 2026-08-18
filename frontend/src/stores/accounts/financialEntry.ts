import { defineStore } from 'pinia';
import { financialEntryApi, financialStateApi } from '@/services/accounts/financialEntry';
import type { FinancialEntry, CreateFinancialEntryInput, FinancialDashboardSummary } from '@/types/financialEntry.types';
import type { PaginationMeta } from '@/types/admin.types';

export const useFinancialEntryStore = defineStore('financialEntries', {
  state: () => ({
    items: [] as FinancialEntry[],
    meta: null as PaginationMeta | null,
    loading: false,
    dashboard: null as FinancialDashboardSummary | null,
  }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await financialEntryApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async getById(id: string) {
      const response = await financialEntryApi.getById(id);
      return response.data.data;
    },
    async create(payload: CreateFinancialEntryInput) {
      const response = await financialEntryApi.create(payload);
      return response.data.data;
    },
    async cancel(id: string, reason: string) {
      const response = await financialEntryApi.cancel(id, reason);
      return response.data.data;
    },
    async reverse(id: string, reason?: string) {
      const response = await financialEntryApi.reverse(id, reason);
      return response.data.data;
    },
    async remove(id: string) {
      await financialEntryApi.remove(id);
    },
    async fetchDashboard(params: { from?: string; to?: string } = {}) {
      const response = await financialStateApi.dashboard(params);
      this.dashboard = response.data.data;
      return response.data.data;
    },
  },
});
