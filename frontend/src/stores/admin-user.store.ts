import { defineStore } from 'pinia';
import { adminUserApi, AdminUserListParams, CreateAdminUserPayload, UpdateAdminUserPayload } from '@/services/admin-user.service';
import type { AdminUser, PaginationMeta } from '@/types/admin.types';

interface AdminUserState {
  items: AdminUser[];
  meta: PaginationMeta | null;
  loading: boolean;
}

export const useAdminUserStore = defineStore('adminUsers', {
  state: (): AdminUserState => ({
    items: [],
    meta: null,
    loading: false,
  }),

  actions: {
    async fetchList(params: AdminUserListParams) {
      this.loading = true;
      try {
        const response = await adminUserApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },

    async create(payload: CreateAdminUserPayload) {
      const response = await adminUserApi.create(payload);
      return response.data.data;
    },

    async update(id: string, payload: UpdateAdminUserPayload) {
      const response = await adminUserApi.update(id, payload);
      return response.data.data;
    },

    async activate(id: string) {
      await adminUserApi.activate(id);
    },

    async deactivate(id: string) {
      await adminUserApi.deactivate(id);
    },

    async remove(id: string) {
      await adminUserApi.remove(id);
    },

    async resetPassword(id: string, newPassword: string) {
      await adminUserApi.resetPassword(id, newPassword);
    },

    async uploadPhoto(id: string, file: File) {
      const response = await adminUserApi.uploadPhoto(id, file);
      return response.data.data;
    },
  },
});
