import { Request } from 'express';
import { prisma } from '../config/db';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';

function parseRange(query: Request['query']) {
  const to = query.to ? new Date(`${query.to}T23:59:59.999Z`) : new Date();
  const from = query.from ? new Date(`${query.from}T00:00:00.000Z`) : new Date(to.getFullYear(), to.getMonth(), 1);
  return { from, to };
}

/**
 * Voucher/Ledger/Approval-workflow audit sections (voucherAudit,
 * ledgerAudit, deletedTransactions, modifiedTransactions, approvalHistory,
 * backdatedEntries) have no equivalent under the ledger-free model — the
 * Voucher/VoucherAuditEntry/ApprovalInstance tables they read no longer
 * exist. Only userActivity remains: a plain AuditLog-table query,
 * unaffected by the Voucher/Ledger removal.
 */
export const auditReportService = {
  async userActivity(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const { from, to } = parseRange(query);
    const where = { createdAt: { gte: from, lte: to }, ...(query.userId ? { userId: query.userId as string } : {}) };

    const [rows, total] = await prisma.$transaction([
      prisma.auditLog.findMany({ where, include: { user: { select: { id: true, fullName: true } } }, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.auditLog.count({ where }),
    ]);
    return {
      data: rows.map((r) => ({ id: r.id, user: r.user?.fullName || 'System', action: r.action, entityType: r.entityType, entityId: r.entityId, description: r.description, createdAt: r.createdAt })),
      meta: buildPaginationMeta(page, pageSize, total),
    };
  },
};
