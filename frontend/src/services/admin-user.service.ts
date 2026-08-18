import api from './api';
import type { ApiResponse } from '@/types/api.types';
import type { AdminUser, PaginationMeta } from '@/types/admin.types';

export interface AdminUserListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
  roleId?: string;
  teamId?: string;
}

export interface CreateAdminUserPayload {
  username: string;
  email?: string;
  phone?: string;
  fullName: string;
  password: string;
  roleIds?: string[];
  teamIds?: string[];
}

export interface UpdateAdminUserPayload {
  email?: string;
  phone?: string;
  fullName?: string;
  roleIds?: string[];
  teamIds?: string[];
}

export const adminUserApi = {
  list(params: AdminUserListParams) {
    return api.get<ApiResponse<AdminUser[]> & { meta: PaginationMeta }>('/administration/users', { params });
  },
  getById(id: string) {
    return api.get<ApiResponse<AdminUser>>(`/administration/users/${id}`);
  },
  create(payload: CreateAdminUserPayload) {
    return api.post<ApiResponse<AdminUser>>('/administration/users', payload);
  },
  update(id: string, payload: UpdateAdminUserPayload) {
    return api.put<ApiResponse<AdminUser>>(`/administration/users/${id}`, payload);
  },
  activate(id: string) {
    return api.patch<ApiResponse<AdminUser>>(`/administration/users/${id}/activate`);
  },
  deactivate(id: string) {
    return api.patch<ApiResponse<AdminUser>>(`/administration/users/${id}/deactivate`);
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/administration/users/${id}`);
  },
  resetPassword(id: string, newPassword: string) {
    return api.post<ApiResponse<null>>(`/administration/users/${id}/reset-password`, { newPassword });
  },
  uploadPhoto(id: string, file: File) {
    const formData = new FormData();
    formData.append('photo', file);
    return api.post<ApiResponse<AdminUser>>(`/administration/users/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
