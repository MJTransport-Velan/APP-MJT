import { defineStore } from 'pinia';
import {
  adminRoleApi,
  AdminRoleListParams,
  CreateRolePayload,
  UpdateRolePayload,
  CloneRolePayload,
} from '@/services/admin-role.service';
import type { AdminRole, PaginationMeta } from '@/types/admin.types';

interface AdminRoleState {
  items: AdminRole[];
  meta: PaginationMeta | null;
  loading: boolean;
}

export const useAdminRoleStore = defineStore('adminRoles', {
  state: (): AdminRoleState => ({
    items: [],
    meta: null,
    loading: false,
  }),

  actions: {
    async fetchList(params: AdminRoleListParams) {
      this.loading = true;
      try {
        const response = await adminRoleApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },

    async create(payload: CreateRolePayload) {
      const response = await adminRoleApi.create(payload);
      return response.data.data;
    },

    async update(id: string, payload: UpdateRolePayload) {
      const response = await adminRoleApi.update(id, payload);
      return response.data.data;
    },

    async remove(id: string) {
      await adminRoleApi.remove(id);
    },

    async clone(id: string, payload: CloneRolePayload) {
      const response = await adminRoleApi.clone(id, payload);
      return response.data.data;
    },

    async assignPermissions(id: string, permissionIds: string[]) {
      const response = await adminRoleApi.assignPermissions(id, permissionIds);
      return response.data.data;
    },
  },
});
