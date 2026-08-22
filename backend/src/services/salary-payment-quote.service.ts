import { prisma } from '../config/db';
import { AppError } from '../middlewares/error.middleware';
import { driverSalaryStructureRepository } from '../repositories/driver-salary-structure.repository';
import { computeSalaryBreakdown } from '../utils/salaryStructure.util';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function periodBounds(period: string) {
  const [year, month] = period.split('-').map(Number);
  if (!year || !month || month < 1 || month > 12) throw new AppError('period must be in YYYY-MM format', 422);
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { year, month, monthStart, monthEnd };
}

/**
 * Powers the Financial Entry "Salary Entry" toggle (Record Office Expense
 * dialog) — given an employee/driver and a month, suggests how much salary
 * to pay: the active Salary Structure's net amount, minus whatever
 * unsettled advances were raised that same month. financial-entry.service.ts's
 * delegateToEmployee/DriverSalaryPayment recomputes the same month-scoped
 * advance set server-side at submit time and settles it — this quote is
 * purely a preview, nothing here is persisted.
 */
export const salaryPaymentQuoteService = {
  async employeeQuote(employeeId: string, period: string) {
    const { year, month, monthStart, monthEnd } = periodBounds(period);

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, deletedAt: null },
      select: { id: true, name: true, employeeCode: true, designation: { select: { name: true } } },
    });
    if (!employee) throw new AppError('Employee not found', 404);

    const structure = await prisma.salaryStructure.findFirst({
      where: { employeeId, isActive: true, deletedAt: null },
      include: { components: true },
    });
    // Percentages must be evaluated, not summed as rupees — see
    // computeSalaryBreakdown. The gross/deduction split is returned too so the
    // salary-entry screen can show how the figure was reached.
    const breakdown = structure ? computeSalaryBreakdown(structure.components) : null;
    const structureAmount = breakdown ? breakdown.netAmount : null;

    const advances = await prisma.employeeAdvance.findMany({
      where: { employeeId, approvalStatus: 'APPROVED', isSettled: false, deletedAt: null, createdAt: { gte: monthStart, lte: monthEnd } },
      select: { id: true, advanceNumber: true, amount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const advanceTotal = round2(advances.reduce((s, a) => s + Number(a.amount), 0));
    const netAmount = structureAmount === null ? null : Math.max(0, round2(structureAmount - advanceTotal));

    const alreadyPaid = await prisma.employeeSalaryPayment.findUnique({ where: { employeeId_year_month: { employeeId, year, month } } });

    return {
      party: { id: employee.id, name: employee.name, code: employee.employeeCode, designation: employee.designation?.name ?? null },
      structureAmount,
      grossEarnings: breakdown ? breakdown.grossEarnings : null,
      totalDeductions: breakdown ? breakdown.totalDeductions : null,
      advances: advances.map((a) => ({ id: a.id, number: a.advanceNumber, amount: Number(a.amount), date: a.createdAt })),
      advanceTotal,
      netAmount,
      alreadyPaid: !!alreadyPaid,
    };
  },

  async driverQuote(driverId: string, period: string) {
    const { year, month, monthStart, monthEnd } = periodBounds(period);

    const driver = await prisma.driver.findFirst({
      where: { id: driverId, deletedAt: null },
      select: { id: true, name: true, code: true },
    });
    if (!driver) throw new AppError('Driver not found', 404);

    const structure = await driverSalaryStructureRepository.findActiveForDriver(driverId);
    let structureAmount: number | null = null;
    if (structure?.salaryType === 'FIXED') {
      structureAmount = round2(Number(structure.fixedAmount ?? 0));
    } else if (structure?.salaryType === 'PERCENT_OF_FREIGHT') {
      const freight = await driverSalaryStructureRepository.sumFreightForDriverInPeriod(driverId, monthStart, monthEnd);
      structureAmount = round2(freight * (Number(structure.percentValue ?? 0) / 100));
    }

    const advances = await prisma.driverAdvance.findMany({
      where: { driverId, approvalStatus: 'APPROVED', isSettled: false, deletedAt: null, createdAt: { gte: monthStart, lte: monthEnd } },
      select: { id: true, advanceNumber: true, amount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const advanceTotal = round2(advances.reduce((s, a) => s + Number(a.amount), 0));
    const netAmount = structureAmount === null ? null : Math.max(0, round2(structureAmount - advanceTotal));

    const alreadyPaid = await prisma.driverSalaryPayment.findUnique({ where: { driverId_year_month: { driverId, year, month } } });

    return {
      party: { id: driver.id, name: driver.name, code: driver.code, designation: null as string | null },
      structureAmount,
      advances: advances.map((a) => ({ id: a.id, number: a.advanceNumber, amount: Number(a.amount), date: a.createdAt })),
      advanceTotal,
      netAmount,
      alreadyPaid: !!alreadyPaid,
    };
  },
};
