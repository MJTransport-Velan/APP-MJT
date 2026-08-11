import { Request } from 'express';
import { adminAuditRepository, AdminAuditLogWithUser } from '../repositories/admin-audit.repository';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';

function serialize(log: AdminAuditLogWithUser) {
  return {
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    description: log.description,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    performedBy: log.user
      ? { id: log.user.id, username: log.user.username, fullName: log.user.fullName }
      : null,
    createdAt: log.createdAt,
  };
}

export const adminAuditService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const search = (query.search as string) || undefined;
    const action = (query.action as string) || undefined;
    const entityType = (query.entityType as string) || undefined;
    const userId = (query.userId as string) || undefined;
    const from = query.from ? new Date(query.from as string) : undefined;
    const to = query.to ? new Date(query.to as string) : undefined;

    const { rows, total } = await adminAuditRepository.findManyPaginated({
      skip,
      take,
      search,
      action,
      entityType,
      userId,
      from,
      to,
    });

    return {
      data: rows.map(serialize),
      meta: buildPaginationMeta(page, pageSize, total),
    };
  },
};
