import { defineStore } from 'pinia';
import { openingBalanceApi } from '@/services/accounts/openingBalance';
import type {
  FinancialMigration,
  OpeningBalanceEntry,
  MigrationSummary,
} from '@/types/openingBalance.types';

export const useOpeningBalanceStore = defineStore('openingBalance', {
  state: () => ({
    migration: null as FinancialMigration | null,
    entries: [] as OpeningBalanceEntry[],
    summary: null as MigrationSummary | null,
    loading: false,
  }),
  getters: {
    /** Amounts are locked once the opening position is finalized; classification and status stay open. */
    isFinalized: (state) => state.migration?.status === 'FINALIZED',
    byCategory: (state) => (category: string) => state.entries.filter((e) => e.category === category),
  },
  actions: {
    async fetchAll() {
      this.loading = true;
      try {
        const [list, summary] = await Promise.all([openingBalanceApi.list(), openingBalanceApi.summary()]);
        this.migration = list.data.data.migration;
        this.entries = list.data.data.entries;
        this.summary = summary.data.data;
      } finally {
        this.loading = false;
      }
    },
    async saveMigration(payload: Record<string, unknown>) {
      const response = await openingBalanceApi.saveMigration(payload);
      this.migration = response.data.data;
      return this.migration;
    },
    async finalize() {
      const response = await openingBalanceApi.finalize();
      this.migration = response.data.data;
      return this.migration;
    },
    async reopen() {
      const response = await openingBalanceApi.reopen();
      this.migration = response.data.data;
      return this.migration;
    },
    async create(payload: Record<string, unknown>) {
      const response = await openingBalanceApi.create(payload);
      return response.data.data;
    },
    async update(id: string, payload: Record<string, unknown>) {
      const response = await openingBalanceApi.update(id, payload);
      return response.data.data;
    },
    async reclassify(id: string, payload: Record<string, unknown>) {
      const response = await openingBalanceApi.reclassify(id, payload);
      return response.data.data;
    },
    async setStatus(id: string, status: string) {
      const response = await openingBalanceApi.setStatus(id, status);
      return response.data.data;
    },
    async remove(id: string) {
      await openingBalanceApi.remove(id);
    },
  },
});
