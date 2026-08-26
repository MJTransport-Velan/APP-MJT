import { defineStore } from 'pinia';
import { loanApi } from '@/services/accounts/loans';
import type { Loan, LoanDashboard, PaginationMeta } from '@/types/loans.types';

export const useLoanStore = defineStore('loans', {
  state: () => ({
    items: [] as Loan[],
    meta: null as PaginationMeta | null,
    current: null as Loan | null,
    dashboard: null as LoanDashboard | null,
    loading: false,
  }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await loanApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async fetchById(id: string) {
      this.loading = true;
      try {
        const response = await loanApi.getById(id);
        this.current = response.data.data;
        return this.current;
      } finally {
        this.loading = false;
      }
    },
    async fetchDashboard(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await loanApi.dashboard(params);
        this.dashboard = response.data.data;
      } finally {
        this.loading = false;
      }
    },
    async create(payload: Record<string, unknown>) {
      const response = await loanApi.create(payload);
      return response.data.data;
    },
    async update(id: string, payload: Record<string, unknown>) {
      const response = await loanApi.update(id, payload);
      return response.data.data;
    },
    async remove(id: string) {
      await loanApi.remove(id);
    },
    // Both of these return the whole refreshed loan, so the detail screen
    // never has to re-fetch to show the new outstanding/schedule.
    async payEmi(loanId: string, installmentId: string, payload: Record<string, unknown>) {
      const response = await loanApi.payEmi(loanId, installmentId, payload);
      this.current = response.data.data;
      return this.current;
    },
    async reverseEmi(loanId: string, installmentId: string) {
      const response = await loanApi.reverseEmi(loanId, installmentId);
      this.current = response.data.data;
      return this.current;
    },
  },
});
