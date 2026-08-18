import { defineStore } from 'pinia';
import {
  intentApi,
  tripApi,
  tripDocumentApi,
  tripExpenseApi,
  tripNoteApi,
  operationsDashboardApi,
} from '@/services/operations';
import type {
  Intent,
  IntentStats,
  Trip,
  TripStats,
  TripStatusHistoryEntry,
  TripDocument,
  TripExpense,
  TripNote,
  OperationsDashboardSummary,
  PaginationMeta,
  FleetType,
} from '@/types/operations.types';

export const useIntentStore = defineStore('opsIntents', {
  state: () => ({
    items: [] as Intent[],
    meta: null as PaginationMeta | null,
    stats: null as IntentStats | null,
    loading: false,
  }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await intentApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async fetchStats() {
      const response = await intentApi.stats();
      this.stats = response.data.data;
    },
    async getById(id: string) {
      const response = await intentApi.getById(id);
      return response.data.data;
    },
    async create(payload: Record<string, unknown>) {
      const response = await intentApi.create(payload);
      return response.data.data;
    },
    async update(id: string, payload: Record<string, unknown>) {
      const response = await intentApi.update(id, payload);
      return response.data.data;
    },
    async submit(id: string) {
      const response = await intentApi.submit(id);
      return response.data.data;
    },
    async approve(id: string, opsAmount: number, fleetType: FleetType) {
      const response = await intentApi.approve(id, opsAmount, fleetType);
      return response.data.data;
    },
    async reject(id: string, rejectionReason: string) {
      const response = await intentApi.reject(id, rejectionReason);
      return response.data.data;
    },
    async cancel(id: string, remarks?: string) {
      const response = await intentApi.cancel(id, remarks);
      return response.data.data;
    },
    async remove(id: string) {
      await intentApi.remove(id);
    },
  },
});

export const useTripStore = defineStore('opsTrips', {
  state: () => ({
    items: [] as Trip[],
    meta: null as PaginationMeta | null,
    stats: null as TripStats | null,
    timeline: [] as TripStatusHistoryEntry[],
    loading: false,
  }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await tripApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async fetchStats() {
      const response = await tripApi.stats();
      this.stats = response.data.data;
    },
    async getById(id: string) {
      const response = await tripApi.getById(id);
      return response.data.data;
    },
    async fetchTimeline(id: string) {
      const response = await tripApi.timeline(id);
      this.timeline = response.data.data;
    },
    async availableResources(excludeTripId?: string) {
      const response = await tripApi.availableResources(excludeTripId);
      return response.data.data;
    },
    async create(payload: Record<string, unknown>) {
      const response = await tripApi.create(payload);
      return response.data.data;
    },
    async update(id: string, payload: Record<string, unknown>) {
      const response = await tripApi.update(id, payload);
      return response.data.data;
    },
    async assign(id: string, payload: Record<string, unknown>) {
      const response = await tripApi.assign(id, payload);
      return response.data.data;
    },
    async allocate(id: string, payload: Record<string, unknown>) {
      const response = await tripApi.allocate(id, payload);
      return response.data.data;
    },
    async updateStatus(id: string, status: string, notes?: string, additionalCharge?: number) {
      const response = await tripApi.updateStatus(id, status, notes, additionalCharge);
      return response.data.data;
    },
    async start(id: string, notes?: string) {
      const response = await tripApi.start(id, notes);
      return response.data.data;
    },
    async complete(id: string, notes?: string) {
      const response = await tripApi.complete(id, notes);
      return response.data.data;
    },
    async cancel(id: string, cancelReason: string) {
      const response = await tripApi.cancel(id, cancelReason);
      return response.data.data;
    },
    async remove(id: string) {
      await tripApi.remove(id);
    },
  },
});

export const useTripNoteStore = defineStore('opsTripNotes', {
  state: () => ({
    items: [] as TripNote[],
    loading: false,
  }),
  actions: {
    async fetchList(tripId: string) {
      this.loading = true;
      try {
        const response = await tripNoteApi.list(tripId);
        this.items = response.data.data;
      } finally {
        this.loading = false;
      }
    },
    async create(tripId: string, note: string) {
      const response = await tripNoteApi.create(tripId, note);
      this.items.unshift(response.data.data);
      return response.data.data;
    },
  },
});

export const usePodStore = defineStore('opsPod', {
  state: () => ({
    documents: [] as TripDocument[],
    loading: false,
  }),
  actions: {
    async fetchList(params: { tripId?: string; type?: string } = {}) {
      this.loading = true;
      try {
        const response = await tripDocumentApi.list(params);
        this.documents = response.data.data;
      } finally {
        this.loading = false;
      }
    },
    async upload(tripId: string, type: string, file: File, remarks?: string) {
      const response = await tripDocumentApi.upload(tripId, type, file, remarks);
      return response.data.data;
    },
    async verify(id: string, status: 'VERIFIED' | 'REJECTED', remarks?: string) {
      const response = await tripDocumentApi.verify(id, status, remarks);
      return response.data.data;
    },
  },
});

export const useTripExpenseStore = defineStore('opsTripExpenses', {
  state: () => ({
    items: [] as TripExpense[],
    meta: null as PaginationMeta | null,
    loading: false,
  }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await tripExpenseApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async create(payload: Record<string, unknown>) {
      const response = await tripExpenseApi.create(payload);
      return response.data.data;
    },
    async update(id: string, payload: Record<string, unknown>) {
      const response = await tripExpenseApi.update(id, payload);
      return response.data.data;
    },
    async remove(id: string) {
      await tripExpenseApi.remove(id);
    },
  },
});

export const useOperationsDashboardStore = defineStore('opsDashboard', {
  state: () => ({
    summary: null as OperationsDashboardSummary | null,
    loading: false,
  }),
  actions: {
    async fetchSummary() {
      this.loading = true;
      try {
        const response = await operationsDashboardApi.getSummary();
        this.summary = response.data.data;
      } finally {
        this.loading = false;
      }
    },
  },
});
