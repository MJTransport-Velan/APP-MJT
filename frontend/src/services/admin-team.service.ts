import api from './api';
import type { ApiResponse } from '@/types/api.types';
import type { AdminTeam, PaginationMeta } from '@/types/admin.types';

export interface CreateTeamPayload {
  name: string;
  departmentId: string;
  description?: string;
}

export interface UpdateTeamPayload {
  name?: string;
  departmentId?: string;
  description?: string;
  isActive?: boolean;
}

export const adminTeamApi = {
  list(params: { page?: number; pageSize?: number; search?: string; departmentId?: string }) {
    return api.get<ApiResponse<AdminTeam[]> & { meta: PaginationMeta }>('/administration/teams', { params });
  },
  getById(id: string) {
    return api.get<ApiResponse<AdminTeam>>(`/administration/teams/${id}`);
  },
  create(payload: CreateTeamPayload) {
    return api.post<ApiResponse<AdminTeam>>('/administration/teams', payload);
  },
  update(id: string, payload: UpdateTeamPayload) {
    return api.put<ApiResponse<AdminTeam>>(`/administration/teams/${id}`, payload);
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/administration/teams/${id}`);
  },
  assignMembers(id: string, userIds: string[]) {
    return api.put<ApiResponse<AdminTeam>>(`/administration/teams/${id}/members`, { userIds });
  },
};
