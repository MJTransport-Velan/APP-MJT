import { prisma } from '../config/db';

/** Read-only aggregation, no new table — same shape as the AR/AP Dashboard extension in Phase 10 (design doc §16/§19). */
export const payrollDashboardService = {
  async getSummary() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      pendingPayrollRuns,
      pendingDriverAdvances,
      pendingEmployeeAdvances,
      pendingDriverSettlements,
      pendingDriverLoans,
      pendingEmployeeLoans,
      outstandingDriverAdvanceAgg,
      outstandingEmployeeAdvanceAgg,
      activeDriverLoans,
      activeEmployeeLoans,
      todaysDriverSettlementPayments,
      todaysPayrollPayments,
    ] = await Promise.all([
      prisma.payrollRun.count({ where: { status: { in: ['DRAFT', 'CALCULATED', 'VERIFIED', 'APPROVED', 'PROCESSED'] }, deletedAt: null } }),
      prisma.driverAdvance.count({ where: { approvalStatus: 'PENDING', deletedAt: null } }),
      prisma.employeeAdvance.count({ where: { approvalStatus: 'PENDING', deletedAt: null } }),
      prisma.driverSettlement.count({ where: { status: { in: ['DRAFT', 'CALCULATED', 'APPROVED'] }, deletedAt: null } }),
      prisma.partyLoan.count({ where: { borrowerType: 'DRIVER', status: 'PENDING_APPROVAL', deletedAt: null } }),
      prisma.partyLoan.count({ where: { borrowerType: 'EMPLOYEE', status: 'PENDING_APPROVAL', deletedAt: null } }),
      prisma.driverAdvance.aggregate({ where: { approvalStatus: 'APPROVED', isSettled: false, deletedAt: null }, _sum: { amount: true } }),
      prisma.employeeAdvance.aggregate({ where: { approvalStatus: 'APPROVED', isSettled: false, deletedAt: null }, _sum: { amount: true } }),
      prisma.partyLoan.findMany({ where: { borrowerType: 'DRIVER', status: 'ACTIVE', deletedAt: null }, include: { installments: true } }),
      prisma.partyLoan.findMany({ where: { borrowerType: 'EMPLOYEE', status: 'ACTIVE', deletedAt: null }, include: { installments: true } }),
      prisma.driverSettlement.aggregate({ where: { status: 'PAID', updatedAt: { gte: todayStart, lte: todayEnd } }, _sum: { netPayable: true } }),
      prisma.payrollRunLine.aggregate({ where: { fundAccountId: { not: null }, updatedAt: { gte: todayStart, lte: todayEnd } }, _sum: { netPay: true } }),
    ]);

    const outstandingDriverLoans = activeDriverLoans.reduce((sum, loan) => {
      const recovered = loan.installments.filter((i) => i.status === 'RECOVERED').reduce((s, i) => s + Number(i.emiAmount), 0);
      return sum + (Number(loan.principalAmount) - recovered);
    }, 0);
    const outstandingEmployeeLoans = activeEmployeeLoans.reduce((sum, loan) => {
      const recovered = loan.installments.filter((i) => i.status === 'RECOVERED').reduce((s, i) => s + Number(i.emiAmount), 0);
      return sum + (Number(loan.principalAmount) - recovered);
    }, 0);

    return {
      pendingPayrollRuns,
      pendingAdvances: pendingDriverAdvances + pendingEmployeeAdvances,
      pendingDriverAdvances,
      pendingEmployeeAdvances,
      pendingSettlements: pendingDriverSettlements,
      pendingLoans: pendingDriverLoans + pendingEmployeeLoans,
      pendingDriverLoans,
      pendingEmployeeLoans,
      outstandingDriverAdvances: Number(outstandingDriverAdvanceAgg._sum.amount || 0),
      outstandingEmployeeAdvances: Number(outstandingEmployeeAdvanceAgg._sum.amount || 0),
      outstandingDriverLoans: Math.round(outstandingDriverLoans * 100) / 100,
      outstandingEmployeeLoans: Math.round(outstandingEmployeeLoans * 100) / 100,
      todaysPayments: Number(todaysDriverSettlementPayments._sum.netPayable || 0) + Number(todaysPayrollPayments._sum.netPay || 0),
    };
  },
};
