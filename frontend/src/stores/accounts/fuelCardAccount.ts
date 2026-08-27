import { defineStore } from 'pinia';
import { fuelCardAccountApi } from '@/services/accounts/fuelCardAccount';
import type { FuelCardAccount, FuelCardAccountSummary, FuelCardTransaction } from '@/types/fuelCard.types';
import type { PaginationMeta } from '@/types/phase6.types';

export const useFuelCardAccountStore = defineStore('fuelCardAccount', {
  state: () => ({
    account: null as FuelCardAccount | null,
    summary: null as FuelCardAccountSummary | null,
    transactions: [] as FuelCardTransaction[],
    transactionsMeta: null as PaginationMeta | null,
    loading: false,
  }),
  actions: {
    async fetchAccount() {
      this.loading = true;
      try {
        const response = await fuelCardAccountApi.getAccount();
        this.account = response.data.data;
      } finally {
        this.loading = false;
      }
    },
    async fetchSummary() {
      const response = await fuelCardAccountApi.summary();
      this.summary = response.data.data;
    },
    async fetchTransactions(params: Record<string, unknown> = {}) {
      const response = await fuelCardAccountApi.listTransactions(params);
      this.transactions = response.data.data;
      this.transactionsMeta = response.data.meta;
    },
    async recharge(payload: Record<string, unknown>) {
      const response = await fuelCardAccountApi.recharge(payload);
      return response.data.data;
    },
    async refund(payload: Record<string, unknown>) {
      const response = await fuelCardAccountApi.refund(payload);
      return response.data.data;
    },
    async adjust(payload: Record<string, unknown>) {
      const response = await fuelCardAccountApi.adjust(payload);
      return response.data.data;
    },
    async updateTransaction(transactionId: string, payload: Record<string, unknown>) {
      const response = await fuelCardAccountApi.updateTransaction(transactionId, payload);
      return response.data.data;
    },
    async removeTransaction(transactionId: string) {
      await fuelCardAccountApi.removeTransaction(transactionId);
    },
  },
});
