import api from './api';
import type { ApiResponse } from '@/types/api.types';
import type { AdminPermission, AdminPermissionGroup } from '@/types/admin.types';

export const adminPermissionApi = {
  list(params: { search?: string; module?: string } = {}) {
    return api.get<ApiResponse<AdminPermission[]>>('/administration/permissions', { params });
  },
  grouped() {
    return api.get<ApiResponse<AdminPermissionGroup[]>>('/administration/permissions/grouped');
  },
};
