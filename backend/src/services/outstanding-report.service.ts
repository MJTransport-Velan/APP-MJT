import { prisma } from '../config/db';

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Driver/Employee Outstanding here — Customer and Supplier Outstanding
 * already exist (Phase 10's ar-ap-outstanding module) and are deliberately
 * not duplicated; the frontend Outstanding Reports hub links out to them
 * (design doc §Outstanding Reports).
 */
export const outstandingReportService = {
  async driverOutstanding() {
    const advances = await prisma.driverAdvance.groupBy({
      by: ['driverId'],
      where: { isSettled: false, deletedAt: null, approvalStatus: 'APPROVED' },
      _sum: { amount: true },
    });
    const drivers = await prisma.driver.findMany({ where: { id: { in: advances.map((a) => a.driverId) } }, select: { id: true, name: true, code: true } });
    const byId = new Map(drivers.map((d) => [d.id, d]));
    const rows = advances
      .map((a) => ({ driverId: a.driverId, driverName: byId.get(a.driverId)?.name || '-', driverCode: byId.get(a.driverId)?.code || '-', outstanding: round2(Number(a._sum.amount || 0)) }))
      .filter((r) => r.outstanding > 0)
      .sort((a, b) => b.outstanding - a.outstanding);
    return { rows, total: round2(rows.reduce((s, r) => s + r.outstanding, 0)) };
  },

  async employeeOutstanding() {
    const advances = await prisma.employeeAdvance.groupBy({
      by: ['employeeId'],
      where: { isSettled: false, deletedAt: null, approvalStatus: 'APPROVED' },
      _sum: { amount: true },
    });
    const employees = await prisma.employee.findMany({ where: { id: { in: advances.map((a) => a.employeeId) } }, select: { id: true, name: true, employeeCode: true } });
    const byId = new Map(employees.map((e) => [e.id, e]));
    const rows = advances
      .map((a) => ({ employeeId: a.employeeId, employeeName: byId.get(a.employeeId)?.name || '-', employeeCode: byId.get(a.employeeId)?.employeeCode || '-', outstanding: round2(Number(a._sum.amount || 0)) }))
      .filter((r) => r.outstanding > 0)
      .sort((a, b) => b.outstanding - a.outstanding);
    return { rows, total: round2(rows.reduce((s, r) => s + r.outstanding, 0)) };
  },
};
