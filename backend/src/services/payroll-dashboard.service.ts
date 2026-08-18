import { prisma } from '../config/db';

/** Read-only aggregation, no new table — same shape as the AR/AP Dashboard extension in Phase 10 (design doc §16/§19). */
export const payrollDashboardService = {
  async getSummary() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      pendingDriverAdvances,
      pendingEmployeeAdvances,
      pendingDriverSettlements,
      outstandingDriverAdvanceAgg,
      outstandingEmployeeAdvanceAgg,
      todaysDriverSettlementPayments,
      todaysSalaryPayments,
    ] = await Promise.all([
      prisma.driverAdvance.count({ where: { approvalStatus: 'PENDING', deletedAt: null } }),
      prisma.employeeAdvance.count({ where: { approvalStatus: 'PENDING', deletedAt: null } }),
      prisma.driverSettlement.count({ where: { status: { in: ['DRAFT', 'CALCULATED', 'APPROVED'] }, deletedAt: null } }),
      prisma.driverAdvance.aggregate({ where: { approvalStatus: 'APPROVED', isSettled: false, deletedAt: null }, _sum: { amount: true } }),
      prisma.employeeAdvance.aggregate({ where: { approvalStatus: 'APPROVED', isSettled: false, deletedAt: null }, _sum: { amount: true } }),
      prisma.driverSettlement.aggregate({ where: { status: 'PAID', updatedAt: { gte: todayStart, lte: todayEnd } }, _sum: { netPayable: true } }),
      prisma.employeeSalaryPayment.aggregate({ where: { paidDate: { gte: todayStart, lte: todayEnd } }, _sum: { amount: true } }),
    ]);

    return {
      pendingAdvances: pendingDriverAdvances + pendingEmployeeAdvances,
      pendingDriverAdvances,
      pendingEmployeeAdvances,
      pendingSettlements: pendingDriverSettlements,
      outstandingDriverAdvances: Number(outstandingDriverAdvanceAgg._sum.amount || 0),
      outstandingEmployeeAdvances: Number(outstandingEmployeeAdvanceAgg._sum.amount || 0),
      todaysPayments: Number(todaysDriverSettlementPayments._sum.netPayable || 0) + Number(todaysSalaryPayments._sum.amount || 0),
    };
  },
};
