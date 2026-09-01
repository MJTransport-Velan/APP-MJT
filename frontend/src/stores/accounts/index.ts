import { defineStore } from 'pinia';
import {
  invoiceApi,
  receiptApi,
  supplierBillApi,
  supplierPaymentApi,
  tripFinancialApi,
  accountsDashboardApi,
  creditControlApi,
  collectionActivityApi,
} from '@/services/accounts';
import type {
  Invoice,
  Receipt,
  SupplierBill,
  SupplierPayment,
  VehicleProfitLine,
  SupplierProfitLine,
  CustomerProfitLine,
  TripFinancialLine,
  AccountsDashboardSummary,
  AccountsDashboardTrends,
  CreditControl,
  CollectionActivity,
  PaginationMeta,
} from '@/types/accounts.types';

export const useInvoiceStore = defineStore('acctsInvoices', {
  state: () => ({
    items: [] as Invoice[],
    meta: null as PaginationMeta | null,
    loading: false,
  }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await invoiceApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async getById(id: string) {
      const response = await invoiceApi.getById(id);
      return response.data.data;
    },
    async generate(payload: Record<string, unknown>) {
      const response = await invoiceApi.generate(payload);
      return response.data.data;
    },
    async update(id: string, payload: Record<string, unknown>) {
      const response = await invoiceApi.update(id, payload);
      return response.data.data;
    },
    async send(id: string) {
      const response = await invoiceApi.send(id);
      return response.data.data;
    },
    async cancel(id: string) {
      const response = await invoiceApi.cancel(id);
      return response.data.data;
    },
    async remove(id: string) {
      await invoiceApi.remove(id);
    },
    async addCreditNote(id: string, payload: Record<string, unknown>) {
      const response = await invoiceApi.addCreditNote(id, payload);
      return response.data.data;
    },
    async addDebitNote(id: string, payload: Record<string, unknown>) {
      const response = await invoiceApi.addDebitNote(id, payload);
      return response.data.data;
    },
  },
});

export const useSupplierBillStore = defineStore('acctsSupplierBills', {
  state: () => ({
    items: [] as SupplierBill[],
    meta: null as PaginationMeta | null,
    loading: false,
  }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await supplierBillApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async getById(id: string) {
      const response = await supplierBillApi.getById(id);
      return response.data.data;
    },
    async generate(payload: Record<string, unknown>) {
      const response = await supplierBillApi.generate(payload);
      return response.data.data;
    },
    async update(id: string, payload: Record<string, unknown>) {
      const response = await supplierBillApi.update(id, payload);
      return response.data.data;
    },
    async cancel(id: string) {
      const response = await supplierBillApi.cancel(id);
      return response.data.data;
    },
    async remove(id: string) {
      await supplierBillApi.remove(id);
    },
    async addCreditNote(id: string, payload: Record<string, unknown>) {
      const response = await supplierBillApi.addCreditNote(id, payload);
      return response.data.data;
    },
    async addDebitNote(id: string, payload: Record<string, unknown>) {
      const response = await supplierBillApi.addDebitNote(id, payload);
      return response.data.data;
    },
  },
});

export const useReceiptStore = defineStore('acctsReceipts', {
  state: () => ({
    items: [] as Receipt[],
    meta: null as PaginationMeta | null,
    loading: false,
  }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await receiptApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async create(payload: Record<string, unknown>) {
      const response = await receiptApi.create(payload);
      return response.data.data;
    },
    async update(id: string, payload: Record<string, unknown>) {
      const response = await receiptApi.update(id, payload);
      return response.data.data;
    },
    async allocate(id: string, invoiceId: string) {
      const response = await receiptApi.allocate(id, invoiceId);
      return response.data.data;
    },
    async remove(id: string) {
      await receiptApi.remove(id);
    },
  },
});

export const useSupplierPaymentStore = defineStore('acctsSupplierPayments', {
  state: () => ({
    items: [] as SupplierPayment[],
    meta: null as PaginationMeta | null,
    loading: false,
  }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await supplierPaymentApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async create(payload: Record<string, unknown>) {
      const response = await supplierPaymentApi.create(payload);
      return response.data.data;
    },
    async update(id: string, payload: Record<string, unknown>) {
      const response = await supplierPaymentApi.update(id, payload);
      return response.data.data;
    },
    async allocate(id: string, billId: string) {
      const response = await supplierPaymentApi.allocate(id, billId);
      return response.data.data;
    },
    async remove(id: string) {
      await supplierPaymentApi.remove(id);
    },
  },
});

export const useTripFinancialStore = defineStore('acctsTripFinancials', {
  state: () => ({
    tripLine: null as TripFinancialLine | null,
    vehicleWise: [] as VehicleProfitLine[],
    supplierWise: [] as SupplierProfitLine[],
    customerWise: [] as CustomerProfitLine[],
    loading: false,
  }),
  actions: {
    async fetchForTrip(tripId: string) {
      const response = await tripFinancialApi.getForTrip(tripId);
      this.tripLine = response.data.data;
      return this.tripLine;
    },
    async fetchVehicleWise(params: { from?: string; to?: string } = {}) {
      this.loading = true;
      try {
        const response = await tripFinancialApi.vehicleWise(params);
        this.vehicleWise = response.data.data;
      } finally {
        this.loading = false;
      }
    },
    async fetchSupplierWise(params: { from?: string; to?: string } = {}) {
      this.loading = true;
      try {
        const response = await tripFinancialApi.supplierWise(params);
        this.supplierWise = response.data.data;
      } finally {
        this.loading = false;
      }
    },
    async fetchCustomerWise(params: { from?: string; to?: string } = {}) {
      this.loading = true;
      try {
        const response = await tripFinancialApi.customerWise(params);
        this.customerWise = response.data.data;
      } finally {
        this.loading = false;
      }
    },
  },
});

export const useAccountsDashboardStore = defineStore('acctsDashboard', {
  state: () => ({
    summary: null as AccountsDashboardSummary | null,
    trends: null as AccountsDashboardTrends | null,
    loading: false,
  }),
  actions: {
    async fetchSummary(params: Record<string, string> = {}) {
      this.loading = true;
      try {
        const response = await accountsDashboardApi.getSummary(params);
        this.summary = response.data.data;
      } finally {
        this.loading = false;
      }
    },
    /**
     * Loaded separately from the summary: the trend series runs a
     * per-month Profit & Loss and is noticeably slower, so it must not
     * hold up the cards at the top of the page.
     */
    async fetchTrends() {
      const response = await accountsDashboardApi.getTrends();
      this.trends = response.data.data;
    },
  },
});

export const useCreditControlStore = defineStore('acctsCreditControl', {
  state: () => ({ current: null as CreditControl | null, loading: false }),
  actions: {
    async fetch(companyId: string) {
      this.loading = true;
      try {
        const response = await creditControlApi.get(companyId);
        this.current = response.data.data;
        return this.current;
      } finally {
        this.loading = false;
      }
    },
    async set(companyId: string, payload: Record<string, unknown>) {
      const response = await creditControlApi.set(companyId, payload);
      this.current = response.data.data;
      return this.current;
    },
  },
});

export const useCollectionActivityStore = defineStore('acctsCollections', {
  state: () => ({ items: [] as CollectionActivity[], meta: null as PaginationMeta | null, upcoming: [] as CollectionActivity[], loading: false }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await collectionActivityApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async fetchUpcoming(days = 3) {
      const response = await collectionActivityApi.upcoming(days);
      this.upcoming = response.data.data;
      return this.upcoming;
    },
    async create(payload: Record<string, unknown>) {
      const response = await collectionActivityApi.create(payload);
      return response.data.data;
    },
  },
});
