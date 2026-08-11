import api from './api';
import type { ApiResponse } from '@/types/api.types';
import type { AdminAuditLog, PaginationMeta } from '@/types/admin.types';

export interface AuditLogListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  action?: string;
  entityType?: string;
  userId?: string;
  from?: string;
  to?: string;
}

export const adminAuditApi = {
  list(params: AuditLogListParams) {
    return api.get<ApiResponse<AdminAuditLog[]> & { meta: PaginationMeta }>('/administration/audit-logs', {
      params,
    });
  },
};
