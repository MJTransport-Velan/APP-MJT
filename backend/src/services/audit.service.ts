import { prisma } from '../config/db';
import { logger } from '../config/logger';
import { DateRange, rangeWhere } from '../utils/dateRange';

export interface RecordAuditInput {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  description?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export const auditService = {
  /**
   * Writes an audit trail entry. This never throws — a failure to log an
   * audit event must not fail the primary request it's attached to.
   */
  async record(input: RecordAuditInput): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: input.userId ?? null,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId ?? null,
          description: input.description ?? null,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
        },
      });
    } catch (err) {
      logger.error('Failed to write audit log', err);
    }
  },

  /**
   * Replaces the old standalone ActivityLog table (architecture
   * optimization pass) — a "recent activity" feed is just the newest
   * AuditLog rows with a human-readable message, not a second table.
   */
  async recentActivity(limit = 10, range?: DateRange) {
    const rows = await prisma.auditLog.findMany({
      where: range ? rangeWhere('createdAt', range) : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { fullName: true, username: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      message: r.description ?? `${r.action} on ${r.entityType}`,
      actor: r.user?.fullName ?? r.user?.username ?? 'System',
      createdAt: r.createdAt,
    }));
  },

  /** Escalation history for a given approvable entity — replaces the old standalone ApprovalEscalationLog table. */
  async escalationHistory(entityType: string, entityId: string) {
    return prisma.auditLog.findMany({
      where: { action: 'ESCALATED', entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
  },
};
