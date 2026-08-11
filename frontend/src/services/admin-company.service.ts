import api from './api';
import type { ApiResponse } from '@/types/api.types';
import type { AdminCompany, PaginationMeta } from '@/types/admin.types';

export interface CreateCompanyPayload {
  name: string;
  code: string;
  groupId: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  panNumber?: string;
}

export interface UpdateCompanyPayload {
  name?: string;
  groupId?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  panNumber?: string;
  isActive?: boolean;
}

export const adminCompanyApi = {
  list(params: { page?: number; pageSize?: number; search?: string; isActive?: boolean; groupId?: string }) {
    return api.get<ApiResponse<AdminCompany[]> & { meta: PaginationMeta }>('/administration/companies', { params });
  },
  getById(id: string) {
    return api.get<ApiResponse<AdminCompany>>(`/administration/companies/${id}`);
  },
  create(payload: CreateCompanyPayload) {
    return api.post<ApiResponse<AdminCompany>>('/administration/companies', payload);
  },
  update(id: string, payload: UpdateCompanyPayload) {
    return api.put<ApiResponse<AdminCompany>>(`/administration/companies/${id}`, payload);
  },
  remove(id: string) {
    return api.delete<ApiResponse<null>>(`/administration/companies/${id}`);
  },
};
