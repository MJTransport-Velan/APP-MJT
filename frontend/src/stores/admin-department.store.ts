import { defineStore } from 'pinia';
import {
  adminDepartmentApi,
  CreateDepartmentPayload,
  UpdateDepartmentPayload,
} from '@/services/admin-department.service';
import type { AdminDepartment, PaginationMeta } from '@/types/admin.types';

interface AdminDepartmentState {
  items: AdminDepartment[];
  meta: PaginationMeta | null;
  loading: boolean;
}

export const useAdminDepartmentStore = defineStore('adminDepartments', {
  state: (): AdminDepartmentState => ({
    items: [],
    meta: null,
    loading: false,
  }),

  actions: {
    async fetchList(params: { page?: number; pageSize?: number; search?: string } = {}) {
      this.loading = true;
      try {
        const response = await adminDepartmentApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },

    async create(payload: CreateDepartmentPayload) {
      const response = await adminDepartmentApi.create(payload);
      return response.data.data;
    },

    async update(id: string, payload: UpdateDepartmentPayload) {
      const response = await adminDepartmentApi.update(id, payload);
      return response.data.data;
    },

    async remove(id: string) {
      await adminDepartmentApi.remove(id);
    },
  },
});
