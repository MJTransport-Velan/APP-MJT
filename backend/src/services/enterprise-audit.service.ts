import { prisma } from '../config/db';

function parseRange(query: { from?: string; to?: string }) {
  const to = query.to ? new Date(`${query.to}T23:59:59.999Z`) : new Date();
  const from = query.from ? new Date(`${query.from}T00:00:00.000Z`) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from, to };
}

function paginate(query: { page?: string; pageSize?: string }) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Number(query.pageSize) || 25);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export const enterpriseAuditService = {
  /**
   * Login/Config/Approval/Data-Change/User-Activity/Deleted/Modified/
   * Backdated audit already exist as distinct capabilities across AuditLog,
   * VoucherAuditEntry and Phase 13 (docs Phase 7) audit-report.service.ts —
   * this is the unified, cross-cutting Enterprise Audit Center view over
   * them, not a fourth parallel audit table.
   */
  async overview() {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [logins, failedLogins, configChanges, apiRequests, apiErrors, deletions] = await Promise.all([
      prisma.auditLog.count({ where: { action: 'LOGIN', createdAt: { gte: since24h } } }),
      prisma.auditLog.count({ where: { action: 'LOGIN_FAILED', createdAt: { gte: since24h } } }),
      prisma.auditLog.count({ where: { action: 'CONFIGURATION_CHANGE', createdAt: { gte: since24h } } }),
      prisma.apiRequestLog.count({ where: { createdAt: { gte: since24h } } }),
      prisma.apiRequestLog.count({ where: { createdAt: { gte: since24h }, statusCode: { gte: 400 } } }),
      prisma.auditLog.count({ where: { action: 'DELETE', createdAt: { gte: since24h } } }),
    ]);
    return { since: since24h, logins, failedLogins, configChanges, apiRequests, apiErrors, deletions };
  },

  async loginAudit(query: { from?: string; to?: string; page?: string; pageSize?: string }) {
    const { from, to } = parseRange(query);
    const { page, pageSize, skip, take } = paginate(query);
    const where = { action: { in: ['LOGIN', 'LOGIN_FAILED', 'LOGOUT'] }, createdAt: { gte: from, lte: to } };
    const [rows, total] = await prisma.$transaction([
      prisma.auditLog.findMany({ where, include: { user: { select: { username: true, fullName: true } } }, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.auditLog.count({ where }),
    ]);
    return { data: rows, meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
  },

  async configurationAudit(query: { from?: string; to?: string; page?: string; pageSize?: string }) {
    const { from, to } = parseRange(query);
    const { page, pageSize, skip, take } = paginate(query);
    const where = { action: 'CONFIGURATION_CHANGE', createdAt: { gte: from, lte: to } };
    const [rows, total] = await prisma.$transaction([
      prisma.auditLog.findMany({ where, include: { user: { select: { username: true, fullName: true } } }, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.auditLog.count({ where }),
    ]);
    return { data: rows, meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
  },

  /** Honestly empty until a caller starts logging action='EXPORT' — no prior-phase export call site was retrofitted to avoid touching every report controller across Phases 1-13. */
  async exportAudit(query: { from?: string; to?: string; page?: string; pageSize?: string }) {
    const { from, to } = parseRange(query);
    const { page, pageSize, skip, take } = paginate(query);
    const where = { action: 'EXPORT', createdAt: { gte: from, lte: to } };
    const [rows, total] = await prisma.$transaction([
      prisma.auditLog.findMany({ where, include: { user: { select: { username: true, fullName: true } } }, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.auditLog.count({ where }),
    ]);
    return { data: rows, meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
  },

  async apiAudit(query: { from?: string; to?: string; method?: string; minStatus?: string; page?: string; pageSize?: string }) {
    const { from, to } = parseRange(query);
    const { page, pageSize, skip, take } = paginate(query);
    const where = {
      createdAt: { gte: from, lte: to },
      ...(query.method ? { method: query.method } : {}),
      ...(query.minStatus ? { statusCode: { gte: Number(query.minStatus) } } : {}),
    };
    const [rows, total] = await prisma.$transaction([
      prisma.apiRequestLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.apiRequestLog.count({ where }),
    ]);
    return { data: rows, meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
  },

  /** Recent activity feed — a single "what just happened" view over AuditLog. */
  async recentActivityFeed(limit = 50) {
    const auditRows = await prisma.auditLog.findMany({
      include: { user: { select: { username: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return auditRows.map((r) => ({
      source: 'AuditLog' as const,
      timestamp: r.createdAt,
      actor: r.user?.fullName ?? r.user?.username ?? 'System',
      action: r.action,
      entityType: r.entityType,
      description: r.description,
    }));
  },
};
