import { defineStore } from 'pinia';
import { adminPermissionApi } from '@/services/admin-permission.service';
import type { AdminPermission, AdminPermissionGroup } from '@/types/admin.types';

interface AdminPermissionState {
  items: AdminPermission[];
  groups: AdminPermissionGroup[];
  loading: boolean;
}

export const useAdminPermissionStore = defineStore('adminPermissions', {
  state: (): AdminPermissionState => ({
    items: [],
    groups: [],
    loading: false,
  }),

  actions: {
    async fetchList(params: { search?: string; module?: string } = {}) {
      this.loading = true;
      try {
        const response = await adminPermissionApi.list(params);
        this.items = response.data.data;
      } finally {
        this.loading = false;
      }
    },

    async fetchGrouped() {
      this.loading = true;
      try {
        const response = await adminPermissionApi.grouped();
        this.groups = response.data.data;
      } finally {
        this.loading = false;
      }
    },
  },
});
