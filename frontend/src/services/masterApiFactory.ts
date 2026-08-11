import api from './api';
import type { ApiResponse } from '@/types/api.types';
import type { PaginationMeta } from '@/types/admin.types';

export interface MasterListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: unknown;
}

/**
 * Generic Axios-backed CRUD API factory, mirroring the shape of the
 * backend's generic master CRUD router (list/get/create/update/status/
 * delete). Used for every master module — simple ones use it as-is,
 * bespoke ones (Vehicles, Drivers, Suppliers) extend it with extra
 * document-upload methods alongside it.
 */
export function createMasterApi<T = Record<string, unknown>>(basePath: string) {
  return {
    list(params: MasterListParams = {}) {
      return api.get<ApiResponse<T[]> & { meta: PaginationMeta }>(basePath, { params });
    },
    getById(id: string) {
      return api.get<ApiResponse<T>>(`${basePath}/${id}`);
    },
    create(payload: Record<string, unknown>) {
      return api.post<ApiResponse<T>>(basePath, payload);
    },
    update(id: string, payload: Record<string, unknown>) {
      return api.put<ApiResponse<T>>(`${basePath}/${id}`, payload);
    },
    toggleStatus(id: string) {
      return api.patch<ApiResponse<T>>(`${basePath}/${id}/status`);
    },
    remove(id: string) {
      return api.delete<ApiResponse<null>>(`${basePath}/${id}`);
    },
  };
}
