import { Request } from 'express';
import { prisma } from '../config/db';

function parseRange(query: Request['query']) {
  const to = query.to ? new Date(`${query.to}T23:59:59.999Z`) : new Date();
  const from = query.from ? new Date(`${query.from}T00:00:00.000Z`) : new Date(to.getFullYear(), to.getMonth(), 1);
  return { from, to };
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Every category-wise cost this ERP tracks directly, in one place —
 * Vehicle Expenses by category (Phase 6/12) and Driver Cost (Phase 5/11).
 * Salary/Admin/Office expense used to come from GL ledger postings with
 * no direct-table equivalent under the ledger-free model, so those tiles
 * have been dropped.
 */
export const expenseAnalysisService = {
  async analyze(query: Request['query']) {
    const { from, to } = parseRange(query);

    const vehicleExpenseGroups = await prisma.vehicleExpense.groupBy({
      by: ['category'],
      where: { deletedAt: null, approvalStatus: 'APPROVED', expenseDate: { gte: from, lte: to } },
      _sum: { totalAmount: true, amount: true },
    });
    const vehicleExpenseByCategory = vehicleExpenseGroups.map((g) => ({
      category: g.category,
      amount: round2(Number(g._sum.totalAmount || g._sum.amount || 0)),
    }));

    const [driverEarnings, driverAdvances] = await Promise.all([
      prisma.driverEarning.aggregate({ where: { approvalStatus: 'APPROVED', createdAt: { gte: from, lte: to } }, _sum: { amount: true } }),
      prisma.driverAdvance.aggregate({ where: { approvalStatus: 'APPROVED', createdAt: { gte: from, lte: to } }, _sum: { amount: true } }),
    ]);

    const driverCost = round2(Number(driverEarnings._sum.amount || 0) + Number(driverAdvances._sum.amount || 0));
    const totalVehicleExpense = round2(vehicleExpenseByCategory.reduce((s, r) => s + r.amount, 0));
    const grandTotal = round2(totalVehicleExpense + driverCost);

    return {
      from,
      to,
      vehicleExpenseByCategory,
      totalVehicleExpense,
      driverCost,
      grandTotal,
    };
  },
};
