import { defineStore } from 'pinia';
import { organizationApi, exchangeRateApi } from '@/services/accounting';
import type { Organization, ExchangeRate, PaginationMeta } from '@/types/accounting.types';

export const useOrganizationStore = defineStore('acctOrganizations', {
  state: () => ({ items: [] as Organization[], meta: null as PaginationMeta | null, loading: false }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await organizationApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async create(payload: Record<string, unknown>) {
      const response = await organizationApi.create(payload);
      return response.data.data;
    },
    async update(id: string, payload: Record<string, unknown>) {
      const response = await organizationApi.update(id, payload);
      return response.data.data;
    },
    async toggleStatus(id: string) {
      const response = await organizationApi.toggleStatus(id);
      return response.data.data;
    },
  },
});

export const useExchangeRateStore = defineStore('acctExchangeRates', {
  state: () => ({ items: [] as ExchangeRate[], loading: false }),
  actions: {
    async fetchForCurrency(currencyId: string) {
      this.loading = true;
      try {
        const response = await exchangeRateApi.list(currencyId);
        this.items = response.data.data;
      } finally {
        this.loading = false;
      }
    },
    async create(payload: Record<string, unknown>) {
      const response = await exchangeRateApi.create(payload);
      return response.data.data;
    },
    async update(id: string, payload: Record<string, unknown>) {
      const response = await exchangeRateApi.update(id, payload);
      return response.data.data;
    },
    async remove(id: string) {
      await exchangeRateApi.remove(id);
    },
  },
});
