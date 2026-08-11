import api from './api';
import type { ApiResponse } from '@/types/api.types';
import type { AdminRole, PaginationMeta } from '@/types/admin.types';

export interface AdminRoleListParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface CreateRolePayload {
  name: string;
  description?: string;
  permissionIds?: string[];
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
}

export interface CloneRolePayload {
  name: string;
  description?: string;
}

export const adminRoleApi = {
  list(params: AdminRoleListParams) {
    return api.get<ApiResponse<AdminRole[]> & { meta: PaginationMeta }>('/administration/roles', { params });
  },
  getById(id: string) {
    return api.get<ApiResponse<AdminRole>>(`/administration/roles/${id}`);
  },
  create(payload: CreateRolePayload) {
    return api.post<ApiResponse<AdminRole>>('/administration/roles', payload);
  },
  update(id: string, payload: UpdateRolePayload) {
    return api.put<ApiResponse<AdminRole>>(`/administration/roles/${id}`, payload);
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/administration/roles/${id}`);
  },
  clone(id: string, payload: CloneRolePayload) {
    return api.post<ApiResponse<AdminRole>>(`/administration/roles/${id}/clone`, payload);
  },
  assignPermissions(id: string, permissionIds: string[]) {
    return api.put<ApiResponse<AdminRole>>(`/administration/roles/${id}/permissions`, { permissionIds });
  },
};
