import { defineStore } from 'pinia';
import { loanGivenApi } from '@/services/accounts/loansGiven';
import type { LoanGiven, LoanGivenSummary } from '@/types/loansGiven.types';
import type { PaginationMeta } from '@/types/phase6.types';

export const useLoanGivenStore = defineStore('loansGiven', {
  state: () => ({
    items: [] as LoanGiven[],
    meta: null as PaginationMeta | null,
    summary: null as LoanGivenSummary | null,
    loading: false,
  }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await loanGivenApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async fetchSummary() {
      const response = await loanGivenApi.summary();
      this.summary = response.data.data;
    },
    async create(payload: Record<string, unknown>) {
      const response = await loanGivenApi.create(payload);
      return response.data.data;
    },
    async update(id: string, payload: Record<string, unknown>) {
      const response = await loanGivenApi.update(id, payload);
      return response.data.data;
    },
    async recordRepayment(id: string, payload: Record<string, unknown>) {
      const response = await loanGivenApi.recordRepayment(id, payload);
      return response.data.data;
    },
    async removeRepayment(id: string, repaymentId: string) {
      const response = await loanGivenApi.removeRepayment(id, repaymentId);
      return response.data.data;
    },
    async writeOff(id: string, payload: Record<string, unknown>) {
      const response = await loanGivenApi.writeOff(id, payload);
      return response.data.data;
    },
    async reopen(id: string) {
      const response = await loanGivenApi.reopen(id);
      return response.data.data;
    },
    async remove(id: string) {
      await loanGivenApi.remove(id);
    },
  },
});
