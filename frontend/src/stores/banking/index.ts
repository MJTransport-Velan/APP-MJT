import { defineStore } from 'pinia';
import {
  bankAccountApi,
  cashAccountApi,
  chequeBookApi,
  bankTransferApi,
  chequeApi,
  bankChargeApi,
  interestApi,
  pettyCashRequestApi,
  bankingDashboardApi,
} from '@/services/banking';
import type {
  BankAccount,
  CashAccount,
  ChequeBook,
  BankTransfer,
  Cheque,
  PettyCashRequest,
  BankingDashboardSummary,
  PaginationMeta,
} from '@/types/banking.types';

export const useBankAccountStore = defineStore('bankAccounts', {
  state: () => ({ items: [] as BankAccount[], meta: null as PaginationMeta | null, loading: false }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await bankAccountApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async create(payload: Record<string, unknown>) {
      const response = await bankAccountApi.create(payload);
      return response.data.data;
    },
    async update(id: string, payload: Record<string, unknown>) {
      const response = await bankAccountApi.update(id, payload);
      return response.data.data;
    },
    async toggleStatus(id: string) {
      const response = await bankAccountApi.toggleStatus(id);
      return response.data.data;
    },
    async remove(id: string) {
      await bankAccountApi.remove(id);
    },
  },
});

export const useCashAccountStore = defineStore('cashAccounts', {
  state: () => ({ items: [] as CashAccount[], meta: null as PaginationMeta | null, loading: false }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await cashAccountApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async create(payload: Record<string, unknown>) {
      const response = await cashAccountApi.create(payload);
      return response.data.data;
    },
    async update(id: string, payload: Record<string, unknown>) {
      const response = await cashAccountApi.update(id, payload);
      return response.data.data;
    },
    async toggleStatus(id: string) {
      const response = await cashAccountApi.toggleStatus(id);
      return response.data.data;
    },
    async remove(id: string) {
      await cashAccountApi.remove(id);
    },
  },
});

export const useChequeBookStore = defineStore('chequeBooks', {
  state: () => ({ items: [] as ChequeBook[], loading: false }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await chequeBookApi.list(params);
        this.items = response.data.data;
      } finally {
        this.loading = false;
      }
    },
    async create(payload: Record<string, unknown>) {
      const response = await chequeBookApi.create(payload);
      return response.data.data;
    },
    async nextAvailable(id: string) {
      const response = await chequeBookApi.nextAvailable(id);
      return response.data.data.nextNumber;
    },
    async update(id: string, payload: Record<string, unknown>) {
      const response = await chequeBookApi.update(id, payload);
      return response.data.data;
    },
    async toggleStatus(id: string) {
      const response = await chequeBookApi.toggleStatus(id);
      return response.data.data;
    },
    async remove(id: string) {
      await chequeBookApi.remove(id);
    },
  },
});

export const useBankTransferStore = defineStore('bankTransfers', {
  state: () => ({ items: [] as BankTransfer[], meta: null as PaginationMeta | null, loading: false }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await bankTransferApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async create(payload: Record<string, unknown>) {
      const response = await bankTransferApi.create(payload);
      return response.data.data;
    },
    async update(id: string, payload: Record<string, unknown>) {
      const response = await bankTransferApi.update(id, payload);
      return response.data.data;
    },
    async remove(id: string) {
      await bankTransferApi.remove(id);
    },
  },
});

export const useChequeStore = defineStore('cheques', {
  state: () => ({ items: [] as Cheque[], meta: null as PaginationMeta | null, current: null as Cheque | null, loading: false }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await chequeApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async fetchById(id: string) {
      const response = await chequeApi.getById(id);
      this.current = response.data.data;
      return this.current;
    },
    async update(id: string, payload: Record<string, unknown>) {
      const response = await chequeApi.update(id, payload);
      return response.data.data;
    },
    async remove(id: string) {
      await chequeApi.remove(id);
    },
    async issue(payload: Record<string, unknown>) {
      const response = await chequeApi.issue(payload);
      return response.data.data;
    },
    async receive(payload: Record<string, unknown>) {
      const response = await chequeApi.receive(payload);
      return response.data.data;
    },
    async deposit(id: string, payload: Record<string, unknown> = {}) {
      const response = await chequeApi.deposit(id, payload);
      return response.data.data;
    },
    async markPresented(id: string) {
      const response = await chequeApi.markPresented(id);
      return response.data.data;
    },
    async clear(id: string, payload: Record<string, unknown> = {}) {
      const response = await chequeApi.clear(id, payload);
      return response.data.data;
    },
    async bounce(id: string, payload: Record<string, unknown>) {
      const response = await chequeApi.bounce(id, payload);
      return response.data.data;
    },
    async cancel(id: string, reason: string) {
      const response = await chequeApi.cancel(id, reason);
      return response.data.data;
    },
    async stopPayment(id: string, reason: string) {
      const response = await chequeApi.stopPayment(id, reason);
      return response.data.data;
    },
  },
});

export const useBankChargeInterestStore = defineStore('bankChargeInterest', {
  state: () => ({}),
  actions: {
    async createBankCharge(payload: Record<string, unknown>) {
      const response = await bankChargeApi.create(payload);
      return response.data.data;
    },
    async createInterest(payload: Record<string, unknown>) {
      const response = await interestApi.create(payload);
      return response.data.data;
    },
  },
});

export const usePettyCashRequestStore = defineStore('pettyCashRequests', {
  state: () => ({ items: [] as PettyCashRequest[], meta: null as PaginationMeta | null, current: null as PettyCashRequest | null, loading: false }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await pettyCashRequestApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async fetchById(id: string) {
      const response = await pettyCashRequestApi.getById(id);
      this.current = response.data.data;
      return this.current;
    },
    async create(payload: Record<string, unknown>) {
      const response = await pettyCashRequestApi.create(payload);
      return response.data.data;
    },
    async update(id: string, payload: Record<string, unknown>) {
      const response = await pettyCashRequestApi.update(id, payload);
      return response.data.data;
    },
    async remove(id: string) {
      await pettyCashRequestApi.remove(id);
    },
    async decide(id: string, decision: 'APPROVED' | 'REJECTED', remarks?: string) {
      const response = await pettyCashRequestApi.decide(id, decision, remarks);
      return response.data.data;
    },
    async disburse(id: string, payload: Record<string, unknown>) {
      const response = await pettyCashRequestApi.disburse(id, payload);
      return response.data.data;
    },
    async close(id: string, payload: Record<string, unknown>) {
      const response = await pettyCashRequestApi.close(id, payload);
      return response.data.data;
    },
  },
});

export const useBankingDashboardStore = defineStore('bankingDashboard', {
  state: () => ({ summary: null as BankingDashboardSummary | null, loading: false }),
  actions: {
    async fetchSummary(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await bankingDashboardApi.summary(params);
        this.summary = response.data.data;
      } finally {
        this.loading = false;
      }
    },
  },
});
