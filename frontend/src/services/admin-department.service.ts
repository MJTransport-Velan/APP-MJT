import api from './api';
import type { ApiResponse } from '@/types/api.types';
import type { AdminDepartment, PaginationMeta } from '@/types/admin.types';

export interface CreateDepartmentPayload {
  name: string;
  description?: string;
}

export interface UpdateDepartmentPayload {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export const adminDepartmentApi = {
  list(params: { page?: number; pageSize?: number; search?: string }) {
    return api.get<ApiResponse<AdminDepartment[]> & { meta: PaginationMeta }>('/administration/departments', {
      params,
    });
  },
  getById(id: string) {
    return api.get<ApiResponse<AdminDepartment>>(`/administration/departments/${id}`);
  },
  create(payload: CreateDepartmentPayload) {
    return api.post<ApiResponse<AdminDepartment>>('/administration/departments', payload);
  },
  update(id: string, payload: UpdateDepartmentPayload) {
    return api.put<ApiResponse<AdminDepartment>>(`/administration/departments/${id}`, payload);
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/administration/departments/${id}`);
  },
};
