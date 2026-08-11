import { defineStore } from 'pinia';
import { createMasterApi, MasterListParams } from '@/services/masterApiFactory';
import type { PaginationMeta } from '@/types/admin.types';

/**
 * Generic Pinia store factory shared by every master module — list/meta/
 * loading state plus create/update/toggleStatus/remove/getById actions,
 * all backed by the matching createMasterApi(basePath) instance.
 */
export function createMasterStore<T extends { id: string }>(storeId: string, basePath: string) {
  const api = createMasterApi<T>(basePath);

  return defineStore(storeId, {
    state: () => ({
      items: [] as T[],
      meta: null as PaginationMeta | null,
      loading: false,
    }),

    actions: {
      async fetchList(params: MasterListParams = {}) {
        this.loading = true;
        try {
          const response = await api.list(params);
          // Pinia's options-store state() return type runs T through
          // UnwrapRef, which an unconstrained generic T can't be proven
          // compatible with — a known Pinia+generics friction point, not a
          // real type hazard here since T is never a Ref.
          this.items = response.data.data as any;
          this.meta = response.data.meta;
        } finally {
          this.loading = false;
        }
      },

      async getById(id: string) {
        const response = await api.getById(id);
        return response.data.data;
      },

      async create(payload: Record<string, unknown>) {
        const response = await api.create(payload);
        return response.data.data;
      },

      async update(id: string, payload: Record<string, unknown>) {
        const response = await api.update(id, payload);
        return response.data.data;
      },

      async toggleStatus(id: string) {
        const response = await api.toggleStatus(id);
        return response.data.data;
      },

      async remove(id: string) {
        await api.remove(id);
      },
    },
  });
}
