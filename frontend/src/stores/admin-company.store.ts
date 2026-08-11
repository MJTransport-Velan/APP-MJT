import { defineStore } from 'pinia';
import {
  adminCompanyApi,
  CreateCompanyPayload,
  UpdateCompanyPayload,
} from '@/services/admin-company.service';
import type { AdminCompany, PaginationMeta } from '@/types/admin.types';

interface AdminCompanyState {
  items: AdminCompany[];
  meta: PaginationMeta | null;
  loading: boolean;
}

export const useAdminCompanyStore = defineStore('adminCompanies', {
  state: (): AdminCompanyState => ({
    items: [],
    meta: null,
    loading: false,
  }),

  actions: {
    async fetchList(params: { page?: number; pageSize?: number; search?: string; isActive?: boolean; groupId?: string } = {}) {
      this.loading = true;
      try {
        const response = await adminCompanyApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },

    async create(payload: CreateCompanyPayload) {
      const response = await adminCompanyApi.create(payload);
      return response.data.data;
    },

    async update(id: string, payload: UpdateCompanyPayload) {
      const response = await adminCompanyApi.update(id, payload);
      return response.data.data;
    },

    async remove(id: string) {
      await adminCompanyApi.remove(id);
    },
  },
});
