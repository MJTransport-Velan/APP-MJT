import { defineStore } from 'pinia';
import {
  driverAdvanceApi,
  driverReimbursementApi,
  driverEarningApi,
  driverPenaltyApi,
  driverLoanApi,
  driverSettlementApi,
  driverStatementApi,
  salaryStructureApi,
  employeeAdvanceApi,
  employeeLoanApi,
  payrollRunApi,
  payrollDashboardApi,
} from '@/services/accounts/driverPayroll';
import type {
  DriverAdvance,
  DriverExpenseReimbursement,
  DriverEarning,
  DriverEarningRule,
  DriverPenalty,
  DriverLoan,
  DriverSettlement,
  DriverSettlementPreview,
  DriverStatement,
  SalaryStructure,
  EmployeeAdvance,
  EmployeeLoan,
  PayrollRun,
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

export const useDriverReimbursementStore = defineStore('driverReimbursements', {
  state: () => ({ items: [] as DriverExpenseReimbursement[], meta: null as PaginationMeta | null, loading: false }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await driverReimbursementApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async request(payload: Record<string, unknown>) {
      const response = await driverReimbursementApi.request(payload);
      return response.data.data;
    },
    async approve(id: string) {
      const response = await driverReimbursementApi.approve(id);
      return response.data.data;
    },
    async reject(id: string, reason?: string) {
      const response = await driverReimbursementApi.reject(id, reason);
      return response.data.data;
    },
    async remove(id: string) {
      await driverReimbursementApi.remove(id);
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

export const useDriverLoanStore = defineStore('driverLoans', {
  state: () => ({ items: [] as DriverLoan[], meta: null as PaginationMeta | null, loading: false }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await driverLoanApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async request(payload: Record<string, unknown>) {
      const response = await driverLoanApi.request(payload);
      return response.data.data;
    },
    async approve(id: string) {
      const response = await driverLoanApi.approve(id);
      return response.data.data;
    },
    async reject(id: string, reason?: string) {
      const response = await driverLoanApi.reject(id, reason);
      return response.data.data;
    },
    async remove(id: string) {
      await driverLoanApi.remove(id);
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
    async remove(id: string) {
      await salaryStructureApi.remove(id);
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

export const useEmployeeLoanStore = defineStore('employeeLoans', {
  state: () => ({ items: [] as EmployeeLoan[], meta: null as PaginationMeta | null, loading: false }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await employeeLoanApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async request(payload: Record<string, unknown>) {
      const response = await employeeLoanApi.request(payload);
      return response.data.data;
    },
    async approve(id: string) {
      const response = await employeeLoanApi.approve(id);
      return response.data.data;
    },
    async reject(id: string, reason?: string) {
      const response = await employeeLoanApi.reject(id, reason);
      return response.data.data;
    },
    async remove(id: string) {
      await employeeLoanApi.remove(id);
    },
  },
});

export const usePayrollRunStore = defineStore('payrollRuns', {
  state: () => ({ items: [] as PayrollRun[], meta: null as PaginationMeta | null, loading: false }),
  actions: {
    async fetchList(params: Record<string, unknown> = {}) {
      this.loading = true;
      try {
        const response = await payrollRunApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
    async getById(id: string) {
      const response = await payrollRunApi.getById(id);
      return response.data.data;
    },
    async create(payload: Record<string, unknown>) {
      const response = await payrollRunApi.create(payload);
      return response.data.data;
    },
    async calculate(id: string, employeeIds?: string[]) {
      const response = await payrollRunApi.calculate(id, employeeIds);
      return response.data.data;
    },
    async verify(id: string) {
      const response = await payrollRunApi.verify(id);
      return response.data.data;
    },
    async approve(id: string) {
      const response = await payrollRunApi.approve(id);
      return response.data.data;
    },
    async process(id: string) {
      const response = await payrollRunApi.process(id);
      return response.data.data;
    },
    async pay(id: string) {
      const response = await payrollRunApi.pay(id);
      return response.data.data;
    },
    async cancel(id: string) {
      const response = await payrollRunApi.cancel(id);
      return response.data.data;
    },
    async revert(id: string) {
      const response = await payrollRunApi.revert(id);
      return response.data.data;
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
