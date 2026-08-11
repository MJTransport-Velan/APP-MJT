import { AiInsightType } from '@prisma/client';
import { prisma } from '../config/db';
import { organizationService } from './organization.service';
import { linearForecast } from '../utils/linearForecast.util';

async function saveInsight(organizationId: string, type: AiInsightType, resultJson: unknown, confidence: number | null, periodLabel?: string) {
  return prisma.aiInsight.create({
    data: { organizationId, type, method: 'STATISTICAL', periodLabel, resultJson: JSON.stringify(resultJson), confidence },
  });
}

export const aiInsightService = {
  // generateCashFlowPrediction / generateExpenseForecast used to read the
  // MIS Dashboard's Voucher/Ledger-derived cashFlowTrend/expenseTrend —
  // dropped with the ledger engine; no direct-table equivalent exists.

  /** Trends off this ERP's own KpiSnapshot history (OUTSTANDING_RECEIVABLES) — honestly reports "insufficient history" rather than fabricating a trend from a single point in time. */
  async generateOutstandingPrediction(monthsAhead = 3) {
    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const snapshots = await prisma.kpiSnapshot.findMany({
      where: { organizationId, kpiDefinition: { code: 'OUTSTANDING_RECEIVABLES' } },
      orderBy: { periodDate: 'asc' },
      take: 90,
    });

    if (snapshots.length < 3) {
      const result = { history: snapshots.map((s) => ({ periodDate: s.periodDate, value: Number(s.value) })), forecast: [], note: 'Insufficient KPI snapshot history yet — needs at least 3 daily snapshots (run COMPUTE_KPI_SNAPSHOTS a few more days).' };
      return saveInsight(organizationId, 'OUTSTANDING_PREDICTION', result, null);
    }

    const history = snapshots.map((s) => Number(s.value));
    const { forecast, r2 } = linearForecast(history, monthsAhead);
    const result = { history: snapshots.map((s) => ({ periodDate: s.periodDate, value: Number(s.value) })), forecast: forecast.map((amount, i) => ({ periodsAhead: i + 1, amount })) };
    return saveInsight(organizationId, 'OUTSTANDING_PREDICTION', result, Math.round(r2 * 100) / 100);
  },

  async list(query: { type?: string; page?: string; pageSize?: string }) {
    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(50, Number(query.pageSize) || 10);
    const where = { organizationId, ...(query.type ? { type: query.type as AiInsightType } : {}) };
    const [rows, total] = await prisma.$transaction([
      prisma.aiInsight.findMany({ where, orderBy: { generatedAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.aiInsight.count({ where }),
    ]);
    const data = rows.map((r) => ({ ...r, resultJson: JSON.parse(r.resultJson) }));
    return { data, meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
  },
};
