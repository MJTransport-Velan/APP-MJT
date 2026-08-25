import { defineStore } from 'pinia';
import {
  assetCategoryApi,
  fixedAssetApi,
  fastTagApi,
} from '@/services/accounts/vehicleAssets';
import type {
  AssetCategory,
  FixedAsset,
  FastTagWallet,
  FastTagTransaction,
  FastTagWalletSummary,
  AssetDashboardSummary,
  PaginationMeta,
} from '@/types/phase6.types';

export const useAssetCategoryStore = defineStore('assetCategories', {
  state: () => ({ items: [] as AssetCategory[], loading: false }),
  actions: {
    async fetchList(isActive?: boolean) {
      this.loading = true;
      try {
        const response = await assetCategoryApi.list(isActive);
        this.items = response.data.data;
      } finally {
        this.loading = false;
      }
    },
    async create(payload: Record<string, unknown>) {
      const response = await assetCategoryApi.create(payload);
      return response.data.data;
    },
    async update(id: string, payload: Record<string, unknown>) {
      const response = await assetCategoryApi.update(id, payload);
      return response.data.data;
    },
    async remove(id: string) {
      await assetCategoryApi.remove(id);
    },
  },
});

export const useFixedAssetStore = defineStore('fixedAssets', {
  state: () => ({ items: [] as FixedAsset[], meta: null as PaginationMeta | null, dashboard: null as AssetDashboardSummary | null, loading: false }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await fixedAssetApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async getById(id: string) {
      const response = await fixedAssetApi.getById(id);
      return response.data.data;
    },
    async register(payload: Record<string, unknown>) {
      const response = await fixedAssetApi.register(payload);
      return response.data.data;
    },
    async update(id: string, payload: Record<string, unknown>) {
      const response = await fixedAssetApi.update(id, payload);
      return response.data.data;
    },
    async approve(id: string, fundingLines: Record<string, unknown>[]) {
      const response = await fixedAssetApi.approve(id, fundingLines);
      return response.data.data;
    },
    async reject(id: string, reason?: string) {
      const response = await fixedAssetApi.reject(id, reason);
      return response.data.data;
    },
    async remove(id: string) {
      await fixedAssetApi.remove(id);
    },
    async fetchDashboard() {
      this.loading = true;
      try {
        const response = await fixedAssetApi.dashboard();
        this.dashboard = response.data.data;
      } finally {
        this.loading = false;
      }
    },
  },
});

export const useFastTagStore = defineStore('fastTagAccounts', {
  state: () => ({
    wallet: null as FastTagWallet | null,
    transactions: [] as FastTagTransaction[],
    transactionsMeta: null as PaginationMeta | null,
    loading: false,
  }),
  actions: {
    async fetchWallet() {
      this.loading = true;
      try {
        const response = await fastTagApi.getWallet();
        this.wallet = response.data.data;
      } finally {
        this.loading = false;
      }
    },
    async fetchTransactions(params: Record<string, unknown> = {}) {
      const response = await fastTagApi.listTransactions(params);
      this.transactions = response.data.data;
      this.transactionsMeta = response.data.meta;
    },
    async recharge(payload: Record<string, unknown>) {
      const response = await fastTagApi.recharge(payload);
      return response.data.data;
    },
    async logUsage(payload: Record<string, unknown>) {
      const response = await fastTagApi.logUsage(payload);
      return response.data.data;
    },
    async refund(payload: Record<string, unknown>) {
      const response = await fastTagApi.refund(payload);
      return response.data.data;
    },
    async adjust(payload: Record<string, unknown>) {
      const response = await fastTagApi.adjust(payload);
      return response.data.data;
    },
    async walletSummary() {
      const response = await fastTagApi.walletSummary();
      return response.data.data;
    },
    async updateTransaction(transactionId: string, payload: Record<string, unknown>) {
      const response = await fastTagApi.updateTransaction(transactionId, payload);
      return response.data.data;
    },
    async removeTransaction(transactionId: string) {
      await fastTagApi.removeTransaction(transactionId);
    },
    async updateTransactionStatus(transactionId: string, payload: Record<string, unknown>) {
      const response = await fastTagApi.updateTransactionStatus(transactionId, payload);
      return response.data.data;
    },
    async uploadTransactionAttachment(transactionId: string, file: File) {
      const response = await fastTagApi.uploadTransactionAttachment(transactionId, file);
      return response.data.data;
    },
  },
});
