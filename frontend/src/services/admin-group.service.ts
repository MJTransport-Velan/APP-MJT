import api from './api';
import type { ApiResponse } from '@/types/api.types';
import type { AdminGroup, PaginationMeta } from '@/types/admin.types';

export interface CreateGroupPayload {
  name: string;
  description?: string;
}

export interface UpdateGroupPayload {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export const adminGroupApi = {
  list(params: { page?: number; pageSize?: number; search?: string } = {}) {
    return api.get<ApiResponse<AdminGroup[]> & { meta: PaginationMeta }>('/administration/groups', { params });
  },
  getById(id: string) {
    return api.get<ApiResponse<AdminGroup>>(`/administration/groups/${id}`);
  },
  create(payload: CreateGroupPayload) {
    return api.post<ApiResponse<AdminGroup>>('/administration/groups', payload);
  },
  update(id: string, payload: UpdateGroupPayload) {
    return api.put<ApiResponse<AdminGroup>>(`/administration/groups/${id}`, payload);
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/administration/groups/${id}`);
  },
  setMembers(id: string, userIds: string[]) {
    return api.put<ApiResponse<AdminGroup>>(`/administration/groups/${id}/members`, { userIds });
  },
  removeMember(id: string, userId: string) {
    return api.delete<ApiResponse<AdminGroup>>(`/administration/groups/${id}/members/${userId}`);
  },
  setCompanies(id: string, companyIds: string[]) {
    return api.put<ApiResponse<AdminGroup>>(`/administration/groups/${id}/companies`, { companyIds });
  },
};
