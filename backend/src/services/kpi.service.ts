import { prisma } from '../config/db';
import { organizationService } from './organization.service';
import { misDashboardService } from './mis-dashboard.service';
import { auditService } from './audit.service';

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Every value here comes from a single misDashboardService.summary() call —
 * read-only reuse of the MIS Dashboard, never a second computation of the
 * same figure. REVENUE_MTD/EXPENSE_MTD/NET_PROFIT_MTD/NET_PROFIT_MARGIN/
 * CASH_AND_BANK_BALANCE used to read Voucher/Ledger-derived figures that
 * have no direct-table equivalent under the ledger-free model, so those
 * codes now resolve to null (skipped) rather than a fabricated value.
 */
async function computeValueForCode(code: string, summary: Awaited<ReturnType<typeof misDashboardService.summary>>): Promise<number | null> {
  switch (code) {
    case 'OUTSTANDING_RECEIVABLES':
      return summary.outstanding.customer;
    case 'OUTSTANDING_PAYABLES':
      return summary.outstanding.supplier;
    case 'VEHICLE_COST_MTD':
      return summary.vehicleCost;
    case 'DRIVER_COST_MTD':
      return summary.driverCost;
    default:
      return null;
  }
}

export const kpiService = {
  listDefinitions() {
    return prisma.kpiDefinition.findMany({ where: { isActive: true }, orderBy: [{ category: 'asc' }, { name: 'asc' }] });
  },

  async computeSnapshots(actorId?: string) {
    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const [definitions, summary] = await Promise.all([prisma.kpiDefinition.findMany({ where: { isActive: true } }), misDashboardService.summary()]);

    const periodDate = new Date();
    periodDate.setUTCHours(0, 0, 0, 0);

    let computed = 0;
    for (const def of definitions) {
      const value = await computeValueForCode(def.code, summary);
      if (value === null) continue;

      const existing = await prisma.kpiSnapshot.findFirst({ where: { kpiDefinitionId: def.id, organizationId, periodDate } });
      if (existing) {
        await prisma.kpiSnapshot.update({ where: { id: existing.id }, data: { value } });
      } else {
        await prisma.kpiSnapshot.create({ data: { kpiDefinitionId: def.id, organizationId, periodDate, value } });
      }
      computed++;
    }

    if (actorId) {
      await auditService.record({ userId: actorId, action: 'COMPUTE_KPI_SNAPSHOTS', entityType: 'KpiSnapshot', description: `Computed ${computed} KPI snapshots for ${periodDate.toISOString().slice(0, 10)}` });
    }
    return { computed, periodDate };
  },

  async executiveDashboard() {
    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const definitions = await prisma.kpiDefinition.findMany({ where: { isActive: true } });

    const cards = await Promise.all(
      definitions.map(async (def) => {
        const snapshots = await prisma.kpiSnapshot.findMany({ where: { kpiDefinitionId: def.id, organizationId }, orderBy: { periodDate: 'desc' }, take: 30 });
        const latest = snapshots[0];
        const trend = snapshots.slice(0, 14).reverse().map((s) => ({ periodDate: s.periodDate, value: Number(s.value) }));
        return {
          code: def.code,
          name: def.name,
          category: def.category,
          unit: def.unit,
          latestValue: latest ? Number(latest.value) : null,
          latestPeriodDate: latest?.periodDate ?? null,
          trend,
        };
      })
    );

    return { cards };
  },
};
