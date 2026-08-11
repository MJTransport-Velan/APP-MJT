import { defineStore } from 'pinia';
import { adminTeamApi, CreateTeamPayload, UpdateTeamPayload } from '@/services/admin-team.service';
import type { AdminTeam, PaginationMeta } from '@/types/admin.types';

interface AdminTeamState {
  items: AdminTeam[];
  meta: PaginationMeta | null;
  loading: boolean;
}

export const useAdminTeamStore = defineStore('adminTeams', {
  state: (): AdminTeamState => ({
    items: [],
    meta: null,
    loading: false,
  }),

  actions: {
    async fetchList(params: { page?: number; pageSize?: number; search?: string; departmentId?: string } = {}) {
      this.loading = true;
      try {
        const response = await adminTeamApi.list(params);
        this.items = response.data.data;
        this.meta = response.data.meta;
      } finally {
        this.loading = false;
      }
    },

    async getById(id: string) {
      const response = await adminTeamApi.getById(id);
      return response.data.data;
    },

    async create(payload: CreateTeamPayload) {
      const response = await adminTeamApi.create(payload);
      return response.data.data;
    },

    async update(id: string, payload: UpdateTeamPayload) {
      const response = await adminTeamApi.update(id, payload);
      return response.data.data;
    },

    async remove(id: string) {
      await adminTeamApi.remove(id);
    },

    async assignMembers(id: string, userIds: string[]) {
      const response = await adminTeamApi.assignMembers(id, userIds);
      return response.data.data;
    },
  },
});
