import { prisma } from '../config/db';

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
function monthRange(monthsAgo: number) {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo + 1, 0, 23, 59, 59, 999));
  return { from, to, label: from.toLocaleString('en-US', { month: 'short', year: '2-digit' }) };
}

/**
 * MIS Dashboard — pure aggregation over direct tables only. The ledger-free
 * model has no source of truth for revenue/expense/netProfit/cashBalance/
 * bankBalance/expenseTrend/cashFlowTrend (those were all Voucher/Ledger
 * derived), so those tiles have been dropped. Everything below reads
 * straight off Invoice/SupplierBill/VehicleExpense/DriverEarning/
 * DriverAdvance/Company/Supplier.
 */
export const misDashboardService = {
  async summary() {
    const thisMonth = monthRange(0);

    const [invoiceOutstanding, supplierBillOutstanding, vehicleExpenseThisMonth, driverEarningsThisMonth, driverAdvancesThisMonth] = await Promise.all([
      prisma.invoice.aggregate({ where: { deletedAt: null, status: { not: 'CANCELLED' } }, _sum: { outstandingAmount: true } }),
      prisma.supplierBill.aggregate({ where: { deletedAt: null, status: { notIn: ['CANCELLED', 'DRAFT'] } }, _sum: { outstandingAmount: true } }),
      prisma.vehicleExpense.aggregate({ where: { deletedAt: null, approvalStatus: 'APPROVED', expenseDate: { gte: thisMonth.from, lte: thisMonth.to } }, _sum: { totalAmount: true, amount: true } }),
      prisma.driverEarning.aggregate({ where: { approvalStatus: 'APPROVED', createdAt: { gte: thisMonth.from, lte: thisMonth.to } }, _sum: { amount: true } }),
      prisma.driverAdvance.aggregate({ where: { approvalStatus: 'APPROVED', createdAt: { gte: thisMonth.from, lte: thisMonth.to } }, _sum: { amount: true } }),
    ]);

    const [topCustomers, topSuppliers] = await Promise.all([
      prisma.invoice.groupBy({ by: ['companyId'], where: { deletedAt: null, status: { not: 'CANCELLED' } }, _sum: { totalAmount: true }, orderBy: { _sum: { totalAmount: 'desc' } }, take: 5 }),
      prisma.supplierBill.groupBy({ by: ['supplierId'], where: { deletedAt: null, status: { notIn: ['CANCELLED', 'DRAFT'] } }, _sum: { totalAmount: true }, orderBy: { _sum: { totalAmount: 'desc' } }, take: 5 }),
    ]);
    const [companies, suppliers] = await Promise.all([
      prisma.company.findMany({ where: { id: { in: topCustomers.map((c) => c.companyId) } }, select: { id: true, name: true } }),
      prisma.supplier.findMany({ where: { id: { in: topSuppliers.map((s) => s.supplierId) } }, select: { id: true, name: true } }),
    ]);
    const companyById = new Map(companies.map((c) => [c.id, c.name]));
    const supplierById = new Map(suppliers.map((s) => [s.id, s.name]));

    return {
      outstanding: {
        customer: round2(Number(invoiceOutstanding._sum.outstandingAmount || 0)),
        supplier: round2(Number(supplierBillOutstanding._sum.outstandingAmount || 0)),
      },
      vehicleCost: round2(Number(vehicleExpenseThisMonth._sum.totalAmount || vehicleExpenseThisMonth._sum.amount || 0)),
      driverCost: round2(Number(driverEarningsThisMonth._sum.amount || 0) + Number(driverAdvancesThisMonth._sum.amount || 0)),
      topCustomers: topCustomers.map((c) => ({ name: companyById.get(c.companyId) || '-', amount: round2(Number(c._sum.totalAmount || 0)) })),
      topSuppliers: topSuppliers.map((s) => ({ name: supplierById.get(s.supplierId) || '-', amount: round2(Number(s._sum.totalAmount || 0)) })),
    };
  },
};
