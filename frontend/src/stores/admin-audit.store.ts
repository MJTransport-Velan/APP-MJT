import { defineStore } from 'pinia';
import { adminAuditApi, AuditLogListParams } from '@/services/admin-audit.service';
import type { AdminAuditLog, PaginationMeta } from '@/types/admin.types';

interface AdminAuditState {
  items: AdminAuditLog[];
  meta: PaginationMeta | null;
  loading: boolean;
}

export const useAdminAuditStore = defineStore('adminAudit', {
  state: (): AdminAuditState => ({
    items: [],
    meta: null,
    loading: false,
  }),

  actions: {
    async fetchList(params: AuditLogListParams) {
      this.loading = true;
      try {
        const response = await adminAuditApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },
  },
});
