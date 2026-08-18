import { defineStore } from 'pinia';
import { createMasterStore } from '../masterStoreFactory';
import {
  vehicleFleetApi,
  vehicleAssignmentApi,
  fuelEntryApi,
  maintenanceApi,
  sparePartUsageApi,
  vehicleExpenseApi,
  fleetDashboardApi,
} from '@/services/fleet';
import type {
  FleetVehicle,
  VehicleTracking,
  VehicleAssignment,
  FuelEntry,
  MaintenanceRecord,
  SparePartUsage,
  VehicleExpense,
  FleetDashboardSummary,
  TimelineEvent,
  PaginationMeta,
} from '@/types/fleet.types';

// Fuel Cards & Spare Parts are simple catalogs — reuse the generic
// master store factory instead of duplicating list/CRUD state.
export const useFuelCardStore = createMasterStore('fleetFuelCard', '/fleet/fuel-cards');
export const useSparePartStore = createMasterStore('fleetSparePart', '/fleet/spare-parts');

export const useVehicleFleetStore = defineStore('fleetVehicleDetail', {
  state: () => ({
    current: null as FleetVehicle | null,
    timeline: [] as TimelineEvent[],
    tracking: [] as VehicleTracking[],
    trackingLoading: false,
    loading: false,
  }),
  actions: {
    async fetchTracking() {
      this.trackingLoading = true;
      try {
        const response = await vehicleFleetApi.tracking();
        this.tracking = response.data.data;
      } finally {
        this.trackingLoading = false;
      }
    },
    async fetchById(id: string) {
      this.loading = true;
      try {
        const response = await vehicleFleetApi.getById(id);
        this.current = response.data.data;
      } finally {
        this.loading = false;
      }
    },
    async fetchTimeline(id: string) {
      const response = await vehicleFleetApi.timeline(id);
      this.timeline = response.data.data;
    },
    async checkAvailability(id: string) {
      const response = await vehicleFleetApi.availability(id);
      return response.data.data;
    },
    async setStatus(id: string, status: string) {
      const response = await vehicleFleetApi.setStatus(id, status);
      this.current = response.data.data;
      return response.data.data;
    },
    async updateCompliance(id: string, payload: Record<string, unknown>) {
      const response = await vehicleFleetApi.updateCompliance(id, payload);
      this.current = response.data.data;
      return response.data.data;
    },
    async uploadPhoto(id: string, file: File) {
      const response = await vehicleFleetApi.uploadPhoto(id, file);
      this.current = response.data.data;
      return response.data.data;
    },
    async uploadFitness(id: string, file: File) {
      const response = await vehicleFleetApi.uploadFitness(id, file);
      this.current = response.data.data;
      return response.data.data;
    },
    async uploadPuc(id: string, file: File) {
      const response = await vehicleFleetApi.uploadPuc(id, file);
      this.current = response.data.data;
      return response.data.data;
    },
  },
});

export const useVehicleAssignmentStore = defineStore('fleetVehicleAssignments', {
  state: () => ({
    items: [] as VehicleAssignment[],
    meta: null as PaginationMeta | null,
    loading: false,
  }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await vehicleAssignmentApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async create(payload: Record<string, unknown>) {
      const response = await vehicleAssignmentApi.create(payload);
      return response.data.data;
    },
    async complete(id: string, notes?: string) {
      const response = await vehicleAssignmentApi.complete(id, notes);
      return response.data.data;
    },
    async cancel(id: string) {
      const response = await vehicleAssignmentApi.cancel(id);
      return response.data.data;
    },
    async update(id: string, notes?: string) {
      const response = await vehicleAssignmentApi.update(id, notes);
      return response.data.data;
    },
    async remove(id: string) {
      await vehicleAssignmentApi.remove(id);
    },
  },
});

export const useFuelEntryStore = defineStore('fleetFuelEntries', {
  state: () => ({
    items: [] as FuelEntry[],
    meta: null as PaginationMeta | null,
    loading: false,
  }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await fuelEntryApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async create(payload: Record<string, unknown>) {
      const response = await fuelEntryApi.create(payload);
      return response.data.data;
    },
    async update(id: string, payload: Record<string, unknown>) {
      const response = await fuelEntryApi.update(id, payload);
      return response.data.data;
    },
    async remove(id: string) {
      await fuelEntryApi.remove(id);
    },
    async uploadBill(id: string, file: File) {
      const response = await fuelEntryApi.uploadBill(id, file);
      return response.data.data;
    },
    async vehicleSummary(vehicleId: string) {
      const response = await fuelEntryApi.vehicleSummary(vehicleId);
      return response.data.data;
    },
    async advanceBalance(advanceId: string) {
      const response = await fuelEntryApi.advanceBalance(advanceId);
      return response.data.data;
    },
  },
});

export const useMaintenanceStore = defineStore('fleetMaintenance', {
  state: () => ({
    items: [] as MaintenanceRecord[],
    meta: null as PaginationMeta | null,
    upcomingDue: [] as MaintenanceRecord[],
    loading: false,
  }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await maintenanceApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async fetchUpcomingDue() {
      const response = await maintenanceApi.upcomingDue();
      this.upcomingDue = response.data.data;
    },
    async create(payload: Record<string, unknown>) {
      const response = await maintenanceApi.create(payload);
      return response.data.data;
    },
    async update(id: string, payload: Record<string, unknown>) {
      const response = await maintenanceApi.update(id, payload);
      return response.data.data;
    },
    async remove(id: string) {
      await maintenanceApi.remove(id);
    },
  },
});

export const useSparePartUsageStore = defineStore('fleetSparePartUsage', {
  state: () => ({
    items: [] as SparePartUsage[],
    meta: null as PaginationMeta | null,
    loading: false,
  }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await sparePartUsageApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async create(payload: Record<string, unknown>) {
      const response = await sparePartUsageApi.create(payload);
      return response.data.data;
    },
  },
});

export const useVehicleExpenseStore = defineStore('fleetVehicleExpenses', {
  state: () => ({
    items: [] as VehicleExpense[],
    meta: null as PaginationMeta | null,
    loading: false,
  }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await vehicleExpenseApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async create(payload: Record<string, unknown>) {
      const response = await vehicleExpenseApi.create(payload);
      return response.data.data;
    },
    async update(id: string, payload: Record<string, unknown>) {
      const response = await vehicleExpenseApi.update(id, payload);
      return response.data.data;
    },
    async approve(id: string, payload: Record<string, unknown> = {}) {
      const response = await vehicleExpenseApi.approve(id, payload);
      return response.data.data;
    },
    async reject(id: string, reason?: string) {
      const response = await vehicleExpenseApi.reject(id, reason);
      return response.data.data;
    },
    async remove(id: string) {
      await vehicleExpenseApi.remove(id);
    },
  },
});

export const useFleetDashboardStore = defineStore('fleetDashboard', {
  state: () => ({
    summary: null as FleetDashboardSummary | null,
    loading: false,
  }),
  actions: {
    async fetchSummary() {
      this.loading = true;
      try {
        const response = await fleetDashboardApi.getSummary();
        this.summary = response.data.data;
      } finally {
        this.loading = false;
      }
    },
  },
});
