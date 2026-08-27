import { defineStore } from 'pinia';
import {
  driverAdvanceApi,
  driverEarningApi,
  driverPenaltyApi,
  driverSettlementApi,
  driverStatementApi,
  salaryStructureApi,
  driverSalaryStructureApi,
  employeeAdvanceApi,
  employeeSalaryPaymentApi,
  driverSalaryPaymentApi,
  payrollDashboardApi,
} from '@/services/accounts/driverPayroll';
import type {
  DriverAdvance,
  DriverEarning,
  DriverEarningRule,
  DriverPenalty,
  DriverSettlement,
  DriverSettlementPreview,
  DriverStatement,
  SalaryStructure,
  DriverSalaryStructure,
  EmployeeAdvance,
  EmployeeSalaryPayment,
  DriverSalaryPayment,
  PayrollDashboardSummary,
  PaginationMeta,
} from '@/types/phase5.types';

export const useDriverAdvanceStore = defineStore('driverAdvances', {
  state: () => ({ items: [] as DriverAdvance[], meta: null as PaginationMeta | null, loading: false }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await driverAdvanceApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async request(payload: Record<string, unknown>) {
      const response = await driverAdvanceApi.request(payload);
      return response.data.data;
    },
    async approve(id: string) {
      const response = await driverAdvanceApi.approve(id);
      return response.data.data;
    },
    async reject(id: string, reason?: string) {
      const response = await driverAdvanceApi.reject(id, reason);
      return response.data.data;
    },
    async remove(id: string) {
      await driverAdvanceApi.remove(id);
    },
  },
});

export const useDriverEarningStore = defineStore('driverEarnings', {
  state: () => ({ items: [] as DriverEarning[], meta: null as PaginationMeta | null, rules: [] as DriverEarningRule[], loading: false }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await driverEarningApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async create(payload: Record<string, unknown>) {
      const response = await driverEarningApi.create(payload);
      return response.data.data;
    },
    async approve(id: string) {
      const response = await driverEarningApi.approve(id);
      return response.data.data;
    },
    async reject(id: string, reason?: string) {
      const response = await driverEarningApi.reject(id, reason);
      return response.data.data;
    },
    async remove(id: string) {
      await driverEarningApi.remove(id);
    },
    async fetchRules() {
      const response = await driverEarningApi.listRules();
      this.rules = response.data.data;
      return this.rules;
    },
    async createRule(payload: Record<string, unknown>) {
      const response = await driverEarningApi.createRule(payload);
      return response.data.data;
    },
    async removeRule(id: string) {
      await driverEarningApi.removeRule(id);
    },
  },
});

export const useDriverPenaltyStore = defineStore('driverPenalties', {
  state: () => ({ items: [] as DriverPenalty[], meta: null as PaginationMeta | null, loading: false }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await driverPenaltyApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async request(payload: Record<string, unknown>) {
      const response = await driverPenaltyApi.request(payload);
      return response.data.data;
    },
    async approve(id: string) {
      const response = await driverPenaltyApi.approve(id);
      return response.data.data;
    },
    async reject(id: string, reason?: string) {
      const response = await driverPenaltyApi.reject(id, reason);
      return response.data.data;
    },
    async remove(id: string) {
      await driverPenaltyApi.remove(id);
    },
  },
});

export const useDriverSettlementStore = defineStore('driverSettlements', {
  state: () => ({ items: [] as DriverSettlement[], meta: null as PaginationMeta | null, loading: false }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await driverSettlementApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async getById(id: string) {
      const response = await driverSettlementApi.getById(id);
      return response.data.data;
    },
    async preview(driverId: string, periodStart: string, periodEnd: string): Promise<DriverSettlementPreview> {
      const response = await driverSettlementApi.preview(driverId, periodStart, periodEnd);
      return response.data.data;
    },
    async create(payload: Record<string, unknown>) {
      const response = await driverSettlementApi.create(payload);
      return response.data.data;
    },
    async calculate(id: string) {
      const response = await driverSettlementApi.calculate(id);
      return response.data.data;
    },
    async approve(id: string) {
      const response = await driverSettlementApi.approve(id);
      return response.data.data;
    },
    async pay(id: string) {
      const response = await driverSettlementApi.pay(id);
      return response.data.data;
    },
    async revert(id: string) {
      const response = await driverSettlementApi.revert(id);
      return response.data.data;
    },
    async remove(id: string) {
      await driverSettlementApi.remove(id);
    },
  },
});

export const useDriverStatementStore = defineStore('driverStatement', {
  state: () => ({ current: null as DriverStatement | null, loading: false }),
  actions: {
    async fetch(driverId: string, from?: string, to?: string) {
      this.loading = true;
      try {
        const response = await driverStatementApi.get(driverId, from, to);
        this.current = response.data.data;
        return this.current;
      } finally {
        this.loading = false;
      }
    },
  },
});

export const useSalaryStructureStore = defineStore('salaryStructures', {
  state: () => ({ items: [] as SalaryStructure[], active: null as SalaryStructure | null, loading: false }),
  actions: {
    async fetchForEmployee(employeeId: string) {
      this.loading = true;
      try {
        const response = await salaryStructureApi.listForEmployee(employeeId);
        this.items = response.data.data;
      } finally {
        this.loading = false;
      }
    },
    async fetchActiveForEmployee(employeeId: string) {
      try {
        const response = await salaryStructureApi.getActiveForEmployee(employeeId);
        this.active = response.data.data;
        return this.active;
      } catch {
        this.active = null;
        return null;
      }
    },
    async create(payload: Record<string, unknown>) {
      const response = await salaryStructureApi.create(payload);
      return response.data.data;
    },
    async update(id: string, payload: Record<string, unknown>) {
      const response = await salaryStructureApi.update(id, payload);
      return response.data.data;
    },
    async remove(id: string) {
      await salaryStructureApi.remove(id);
    },
  },
});

export const useDriverSalaryStructureStore = defineStore('driverSalaryStructures', {
  state: () => ({ items: [] as DriverSalaryStructure[], active: null as DriverSalaryStructure | null, loading: false }),
  actions: {
    async fetchForDriver(driverId: string) {
      this.loading = true;
      try {
        const response = await driverSalaryStructureApi.listForDriver(driverId);
        this.items = response.data.data;
      } finally {
        this.loading = false;
      }
    },
    async fetchActiveForDriver(driverId: string) {
      try {
        const response = await driverSalaryStructureApi.getActiveForDriver(driverId);
        this.active = response.data.data;
        return this.active;
      } catch {
        this.active = null;
        return null;
      }
    },
    async create(payload: Record<string, unknown>) {
      const response = await driverSalaryStructureApi.create(payload);
      return response.data.data;
    },
    async update(id: string, payload: Record<string, unknown>) {
      const response = await driverSalaryStructureApi.update(id, payload);
      return response.data.data;
    },
    async remove(id: string) {
      await driverSalaryStructureApi.remove(id);
    },
  },
});

export const useEmployeeAdvanceStore = defineStore('employeeAdvances', {
  state: () => ({ items: [] as EmployeeAdvance[], meta: null as PaginationMeta | null, loading: false }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await employeeAdvanceApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async request(payload: Record<string, unknown>) {
      const response = await employeeAdvanceApi.request(payload);
      return response.data.data;
    },
    async approve(id: string) {
      const response = await employeeAdvanceApi.approve(id);
      return response.data.data;
    },
    async reject(id: string, reason?: string) {
      const response = await employeeAdvanceApi.reject(id, reason);
      return response.data.data;
    },
    async remove(id: string) {
      await employeeAdvanceApi.remove(id);
    },
  },
});

export const useEmployeeSalaryPaymentStore = defineStore('employeeSalaryPayments', {
  state: () => ({ items: [] as EmployeeSalaryPayment[], loading: false }),
  actions: {
    async fetchForEmployee(employeeId: string) {
      this.loading = true;
      try {
        const response = await employeeSalaryPaymentApi.listForEmployee(employeeId);
        this.items = response.data.data;
      } finally {
        this.loading = false;
      }
    },
  },
});

export const useDriverSalaryPaymentStore = defineStore('driverSalaryPayments', {
  state: () => ({ items: [] as DriverSalaryPayment[], loading: false }),
  actions: {
    async fetchForDriver(driverId: string) {
      this.loading = true;
      try {
        const response = await driverSalaryPaymentApi.listForDriver(driverId);
        this.items = response.data.data;
      } finally {
        this.loading = false;
      }
    },
  },
});

export const usePayrollDashboardStore = defineStore('payrollDashboard', {
  state: () => ({ summary: null as PayrollDashboardSummary | null, loading: false }),
  actions: {
    async fetchSummary() {
      this.loading = true;
      try {
        const response = await payrollDashboardApi.getSummary();
        this.summary = response.data.data;
      } finally {
        this.loading = false;
      }
    },
  },
});
