import { prisma } from '../config/db';
import { DateRange, hasRange, rangeWhere, resolveRange, currentMonthRange } from '../utils/dateRange';
import { partyOutstandingService } from './party-outstanding.service';

function round2(n: number) {
  return Math.round(n * 100) / 100;
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
  /**
   * @param range From/To window for the cost figures and the top
   * customer/supplier league tables. Customer and supplier outstanding are
   * a running "still unpaid" balance rather than a period total, so a date
   * window would misstate them and they are left whole.
   */
  async summary(range: DateRange = {}) {
    const period = resolveRange(range, currentMonthRange);
    // The league tables ranked all-time business before the filter existed;
    // narrowing them to the current month by default would rewrite what the
    // screen means, so they only take a window the user actually picked.
    const invoiceWhere = hasRange(range) ? rangeWhere('invoiceDate', period) : {};
    const billWhere = hasRange(range) ? rangeWhere('billDate', period) : {};

    // Outstanding comes from the shared party model so it carries opening
    // balances — the tiles previously read Invoice/SupplierBill alone and
    // under-reported every debt brought over from the old system.
    const [customerOutstanding, supplierOutstanding, vehicleExpenseInPeriod, driverEarningsInPeriod, driverAdvancesInPeriod] = await Promise.all([
      partyOutstandingService.customerTotals(),
      partyOutstandingService.supplierTotals(),
      prisma.vehicleExpense.aggregate({ where: { deletedAt: null, approvalStatus: 'APPROVED', ...rangeWhere('expenseDate', period) }, _sum: { totalAmount: true, amount: true } }),
      prisma.driverEarning.aggregate({ where: { approvalStatus: 'APPROVED', ...rangeWhere('createdAt', period) }, _sum: { amount: true } }),
      prisma.driverAdvance.aggregate({ where: { approvalStatus: 'APPROVED', ...rangeWhere('createdAt', period) }, _sum: { amount: true } }),
    ]);

    const [topCustomers, topSuppliers] = await Promise.all([
      prisma.invoice.groupBy({ by: ['companyId'], where: { deletedAt: null, status: { not: 'CANCELLED' }, ...invoiceWhere }, _sum: { totalAmount: true }, orderBy: { _sum: { totalAmount: 'desc' } }, take: 5 }),
      prisma.supplierBill.groupBy({ by: ['supplierId'], where: { deletedAt: null, status: { notIn: ['CANCELLED', 'DRAFT'] }, ...billWhere }, _sum: { totalAmount: true }, orderBy: { _sum: { totalAmount: 'desc' } }, take: 5 }),
    ]);
    const [companies, suppliers] = await Promise.all([
      prisma.company.findMany({ where: { id: { in: topCustomers.map((c) => c.companyId) } }, select: { id: true, name: true } }),
      prisma.supplier.findMany({ where: { id: { in: topSuppliers.map((s) => s.supplierId) } }, select: { id: true, name: true } }),
    ]);
    const companyById = new Map(companies.map((c) => [c.id, c.name]));
    const supplierById = new Map(suppliers.map((s) => [s.id, s.name]));

    return {
      period: { from: period.from, to: period.to, filtered: hasRange(range) },
      outstanding: {
        customer: customerOutstanding.total,
        supplier: supplierOutstanding.total,
        // Split out so the screen can say how much of the debt was carried
        // over rather than showing one figure nobody can reconcile.
        openingCustomer: customerOutstanding.opening,
        openingSupplier: supplierOutstanding.opening,
      },
      vehicleCost: round2(Number(vehicleExpenseInPeriod._sum.totalAmount || vehicleExpenseInPeriod._sum.amount || 0)),
      driverCost: round2(Number(driverEarningsInPeriod._sum.amount || 0) + Number(driverAdvancesInPeriod._sum.amount || 0)),
      topCustomers: topCustomers.map((c) => ({ name: companyById.get(c.companyId) || '-', amount: round2(Number(c._sum.totalAmount || 0)) })),
      topSuppliers: topSuppliers.map((s) => ({ name: supplierById.get(s.supplierId) || '-', amount: round2(Number(s._sum.totalAmount || 0)) })),
    };
  },
};
