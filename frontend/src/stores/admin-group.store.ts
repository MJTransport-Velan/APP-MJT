import { defineStore } from 'pinia';
import { adminGroupApi, CreateGroupPayload, UpdateGroupPayload } from '@/services/admin-group.service';
import type { AdminGroup, PaginationMeta } from '@/types/admin.types';

interface AdminGroupState {
  items: AdminGroup[];
  meta: PaginationMeta | null;
  loading: boolean;
}

export const useAdminGroupStore = defineStore('adminGroups', {
  state: (): AdminGroupState => ({
    items: [],
    meta: null,
    loading: false,
  }),

  actions: {
    async fetchList(params: { page?: number; pageSize?: number; search?: string } = {}) {
      this.loading = true;
      try {
        const response = await adminGroupApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },

    async getById(id: string) {
      const response = await adminGroupApi.getById(id);
      return response.data.data;
    },

    async create(payload: CreateGroupPayload) {
      const response = await adminGroupApi.create(payload);
      return response.data.data;
    },

    async update(id: string, payload: UpdateGroupPayload) {
      const response = await adminGroupApi.update(id, payload);
      return response.data.data;
    },

    async remove(id: string) {
      await adminGroupApi.remove(id);
    },

    async setMembers(id: string, userIds: string[]) {
      const response = await adminGroupApi.setMembers(id, userIds);
      return response.data.data;
    },

    async removeMember(id: string, userId: string) {
      const response = await adminGroupApi.removeMember(id, userId);
      return response.data.data;
    },

    async setCompanies(id: string, companyIds: string[]) {
      const response = await adminGroupApi.setCompanies(id, companyIds);
      return response.data.data;
    },
  },
});
