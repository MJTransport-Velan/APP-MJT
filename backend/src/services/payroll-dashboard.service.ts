import { prisma } from '../config/db';
import { DateRange, hasRange, rangeWhere, resolveRange, todayRange } from '../utils/dateRange';

/** Read-only aggregation, no new table — same shape as the AR/AP Dashboard extension in Phase 10 (design doc §16/§19). */
export const payrollDashboardService = {
  /**
   * @param range From/To window. The payments tile covers it (defaulting to
   * today, which is what the tile showed before the filter existed) and the
   * pending counts cover requests raised within it. Outstanding advance
   * balances are a running "still owed" figure, not a period total, so they
   * are left whole.
   */
  async getSummary(range: DateRange = {}) {
    const filtered = hasRange(range);
    const period = resolveRange(range, todayRange);
    const raisedWhere = filtered ? rangeWhere('createdAt', period) : {};

    const [
      pendingDriverAdvances,
      pendingEmployeeAdvances,
      pendingDriverSettlements,
      outstandingDriverAdvanceAgg,
      outstandingEmployeeAdvanceAgg,
      periodDriverSettlementPayments,
      periodSalaryPayments,
    ] = await Promise.all([
      prisma.driverAdvance.count({ where: { approvalStatus: 'PENDING', deletedAt: null, ...raisedWhere } }),
      prisma.employeeAdvance.count({ where: { approvalStatus: 'PENDING', deletedAt: null, ...raisedWhere } }),
      prisma.driverSettlement.count({ where: { status: { in: ['DRAFT', 'CALCULATED', 'APPROVED'] }, deletedAt: null, ...raisedWhere } }),
      prisma.driverAdvance.aggregate({ where: { approvalStatus: 'APPROVED', isSettled: false, deletedAt: null }, _sum: { amount: true } }),
      prisma.employeeAdvance.aggregate({ where: { approvalStatus: 'APPROVED', isSettled: false, deletedAt: null }, _sum: { amount: true } }),
      prisma.driverSettlement.aggregate({ where: { status: 'PAID', ...rangeWhere('updatedAt', period) }, _sum: { netPayable: true } }),
      prisma.employeeSalaryPayment.aggregate({ where: { ...rangeWhere('paidDate', period) }, _sum: { amount: true } }),
    ]);

    return {
      period: { from: period.from, to: period.to, filtered },
      pendingAdvances: pendingDriverAdvances + pendingEmployeeAdvances,
      pendingDriverAdvances,
      pendingEmployeeAdvances,
      pendingSettlements: pendingDriverSettlements,
      outstandingDriverAdvances: Number(outstandingDriverAdvanceAgg._sum.amount || 0),
      outstandingEmployeeAdvances: Number(outstandingEmployeeAdvanceAgg._sum.amount || 0),
      todaysPayments: Number(periodDriverSettlementPayments._sum.netPayable || 0) + Number(periodSalaryPayments._sum.amount || 0),
    };
  },
};
