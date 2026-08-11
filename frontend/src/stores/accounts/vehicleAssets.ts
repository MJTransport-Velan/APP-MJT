import { defineStore } from 'pinia';
import {
  assetCategoryApi,
  fixedAssetApi,
  vehicleLoanApi,
  vehicleTyreApi,
  vehicleBatteryApi,
  vehicleComplianceApi,
  fastTagApi,
  assetTransferApi,
  assetDisposalApi,
  depreciationRunApi,
} from '@/services/accounts/vehicleAssets';
import type {
  AssetCategory,
  FixedAsset,
  VehicleLoan,
  VehicleTyre,
  VehicleBattery,
  VehicleComplianceRecord,
  FastTagWallet,
  FastTagTransaction,
  FastTagWalletSummary,
  AssetTransfer,
  AssetDisposal,
  DepreciationRun,
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

export const useVehicleLoanStore = defineStore('vehicleLoans', {
  state: () => ({ items: [] as VehicleLoan[], meta: null as PaginationMeta | null, loading: false }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await vehicleLoanApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async getById(id: string) {
      const response = await vehicleLoanApi.getById(id);
      return response.data.data;
    },
    async request(payload: Record<string, unknown>) {
      const response = await vehicleLoanApi.request(payload);
      return response.data.data;
    },
    async approve(id: string) {
      const response = await vehicleLoanApi.approve(id);
      return response.data.data;
    },
    async reject(id: string, reason?: string) {
      const response = await vehicleLoanApi.reject(id, reason);
      return response.data.data;
    },
    async disburse(id: string, payload: Record<string, unknown>) {
      const response = await vehicleLoanApi.disburse(id, payload);
      return response.data.data;
    },
    async payInstallment(id: string, installmentId: string, payload: Record<string, unknown> = {}) {
      const response = await vehicleLoanApi.payInstallment(id, installmentId, payload);
      return response.data.data;
    },
    async foreclose(id: string, payload: Record<string, unknown> = {}) {
      const response = await vehicleLoanApi.foreclose(id, payload);
      return response.data.data;
    },
    async remove(id: string) {
      await vehicleLoanApi.remove(id);
    },
  },
});

export const useVehicleTyreStore = defineStore('vehicleTyres', {
  state: () => ({ items: [] as VehicleTyre[], meta: null as PaginationMeta | null, loading: false }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await vehicleTyreApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async install(payload: Record<string, unknown>) {
      const response = await vehicleTyreApi.install(payload);
      return response.data.data;
    },
    async rotate(id: string, payload: Record<string, unknown>) {
      const response = await vehicleTyreApi.rotate(id, payload);
      return response.data.data;
    },
    async remove(id: string, payload: Record<string, unknown> = {}) {
      const response = await vehicleTyreApi.remove(id, payload);
      return response.data.data;
    },
    async scrap(id: string) {
      const response = await vehicleTyreApi.scrap(id);
      return response.data.data;
    },
  },
});

export const useVehicleBatteryStore = defineStore('vehicleBatteries', {
  state: () => ({ items: [] as VehicleBattery[], meta: null as PaginationMeta | null, loading: false }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await vehicleBatteryApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async install(payload: Record<string, unknown>) {
      const response = await vehicleBatteryApi.install(payload);
      return response.data.data;
    },
    async dispose(id: string) {
      const response = await vehicleBatteryApi.dispose(id);
      return response.data.data;
    },
  },
});

export const useVehicleComplianceStore = defineStore('vehicleCompliance', {
  state: () => ({ items: [] as VehicleComplianceRecord[], meta: null as PaginationMeta | null, expiring: [] as VehicleComplianceRecord[], loading: false }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await vehicleComplianceApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async fetchExpiring(days = 30) {
      const response = await vehicleComplianceApi.expiringWithin(days);
      this.expiring = response.data.data;
      return this.expiring;
    },
    async create(payload: Record<string, unknown>) {
      const response = await vehicleComplianceApi.create(payload);
      return response.data.data;
    },
    async fileClaim(id: string, payload: Record<string, unknown>) {
      const response = await vehicleComplianceApi.fileClaim(id, payload);
      return response.data.data;
    },
    async settleClaim(claimId: string, payload: Record<string, unknown>) {
      const response = await vehicleComplianceApi.settleClaim(claimId, payload);
      return response.data.data;
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

export const useAssetTransferStore = defineStore('assetTransfers', {
  state: () => ({ items: [] as AssetTransfer[], meta: null as PaginationMeta | null, loading: false }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await assetTransferApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async request(payload: Record<string, unknown>) {
      const response = await assetTransferApi.request(payload);
      return response.data.data;
    },
    async approve(id: string) {
      const response = await assetTransferApi.approve(id);
      return response.data.data;
    },
    async reject(id: string, reason?: string) {
      const response = await assetTransferApi.reject(id, reason);
      return response.data.data;
    },
  },
});

export const useAssetDisposalStore = defineStore('assetDisposals', {
  state: () => ({ items: [] as AssetDisposal[], meta: null as PaginationMeta | null, loading: false }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await assetDisposalApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async raise(payload: Record<string, unknown>) {
      const response = await assetDisposalApi.raise(payload);
      return response.data.data;
    },
    async approve(id: string, payload: Record<string, unknown> = {}) {
      const response = await assetDisposalApi.approve(id, payload);
      return response.data.data;
    },
    async reject(id: string, reason?: string) {
      const response = await assetDisposalApi.reject(id, reason);
      return response.data.data;
    },
  },
});

export const useDepreciationRunStore = defineStore('depreciationRuns', {
  state: () => ({ items: [] as DepreciationRun[], meta: null as PaginationMeta | null, loading: false }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await depreciationRunApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async getById(id: string) {
      const response = await depreciationRunApi.getById(id);
      return response.data.data;
    },
    async create(payload: Record<string, unknown>) {
      const response = await depreciationRunApi.create(payload);
      return response.data.data;
    },
    async calculate(id: string) {
      const response = await depreciationRunApi.calculate(id);
      return response.data.data;
    },
    async approve(id: string) {
      const response = await depreciationRunApi.approve(id);
      return response.data.data;
    },
  },
});
