import { prisma } from '../config/db';

export const accountsDashboardService = {
  async getSummary() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      outstandingReceivables,
      outstandingPayableTrips,
      monthlyReceipts,
      monthlyTripExpenses,
      monthlySupplierPayments,
      customerOutstanding,
      recentPayments,
      recentReceipts,
    ] = await Promise.all([
      prisma.invoice.aggregate({
        where: { deletedAt: null, status: { notIn: ['CANCELLED'] } },
        _sum: { outstandingAmount: true },
      }),
      prisma.trip.findMany({
        where: { deletedAt: null, status: 'COMPLETED', supplierId: { not: null } },
        select: { id: true, supplierId: true, supplierRate: true },
      }),
      prisma.receipt.aggregate({
        where: { deletedAt: null, receiptDate: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.tripExpense.aggregate({
        where: { deletedAt: null, expenseDate: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.supplierPayment.aggregate({
        where: { deletedAt: null, paymentDate: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.invoice.groupBy({
        by: ['companyId'],
        where: { deletedAt: null, status: { notIn: ['CANCELLED'] }, outstandingAmount: { gt: 0 } },
        _sum: { outstandingAmount: true },
      }),
      prisma.supplierPayment.findMany({
        where: { deletedAt: null },
        include: { supplier: true },
        orderBy: { paymentDate: 'desc' },
        take: 10,
      }),
      prisma.receipt.findMany({
        where: { deletedAt: null },
        include: { company: true },
        orderBy: { receiptDate: 'desc' },
        take: 10,
      }),
    ]);

    // Supplier outstanding = sum(supplierRate for completed trips) - sum(SupplierPayments) per supplier.
    const supplierPaymentSums = await prisma.supplierPayment.groupBy({
      by: ['supplierId'],
      where: { deletedAt: null },
      _sum: { amount: true },
    });
    const paidBySupplier = new Map(supplierPaymentSums.map((s) => [s.supplierId, Number(s._sum.amount || 0)]));

    const chargeBySupplier = new Map<string, number>();
    for (const trip of outstandingPayableTrips) {
      if (!trip.supplierId) continue;
      chargeBySupplier.set(
        trip.supplierId,
        (chargeBySupplier.get(trip.supplierId) || 0) + Number(trip.supplierRate || 0)
      );
    }

    const supplierIds = Array.from(new Set([...chargeBySupplier.keys(), ...paidBySupplier.keys()]));
    const suppliers = await prisma.supplier.findMany({ where: { id: { in: supplierIds } } });
    const supplierNameMap = new Map(suppliers.map((s) => [s.id, s.name]));

    const supplierOutstanding = supplierIds
      .map((id) => ({
        supplierId: id,
        supplierName: supplierNameMap.get(id) || 'Unknown',
        outstanding: (chargeBySupplier.get(id) || 0) - (paidBySupplier.get(id) || 0),
      }))
      .filter((s) => s.outstanding > 0)
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 10);

    const totalOutstandingPayables = supplierIds.reduce(
      (sum, id) => sum + Math.max((chargeBySupplier.get(id) || 0) - (paidBySupplier.get(id) || 0), 0),
      0
    );

    const companyIds = customerOutstanding.map((c) => c.companyId);
    const companies = await prisma.company.findMany({ where: { id: { in: companyIds } } });
    const companyNameMap = new Map(companies.map((c) => [c.id, c.name]));

    const monthlyExpensesTotal =
      Number(monthlyTripExpenses._sum.amount || 0) + Number(monthlySupplierPayments._sum.amount || 0);
    const monthlyRevenue = Number(monthlyReceipts._sum.amount || 0);

    // Phase 10 — Receivables & Payables additions. All computed live, no stored metric table.
    const [
      supplierBillOutstanding,
      todaysCollection,
      todaysPayment,
      overdueInvoices,
      overdueBills,
      pendingReceiptAllocations,
      advanceReceipts,
      advancePayments,
      blockedOrOverLimitCompanies,
    ] = await Promise.all([
      prisma.supplierBill.aggregate({ where: { deletedAt: null, status: { notIn: ['CANCELLED'] } }, _sum: { outstandingAmount: true } }),
      prisma.receipt.aggregate({ where: { deletedAt: null, receiptDate: { gte: startOfToday } }, _sum: { amount: true } }),
      prisma.supplierPayment.aggregate({ where: { deletedAt: null, paymentDate: { gte: startOfToday } }, _sum: { amount: true } }),
      prisma.invoice.count({ where: { deletedAt: null, status: { notIn: ['CANCELLED', 'PAID'] }, dueDate: { lt: now }, outstandingAmount: { gt: 0 } } }),
      prisma.supplierBill.count({ where: { deletedAt: null, status: { notIn: ['CANCELLED', 'PAID'] }, dueDate: { lt: now }, outstandingAmount: { gt: 0 } } }),
      prisma.receipt.count({ where: { deletedAt: null, isAdvance: true } }),
      prisma.receipt.aggregate({ where: { deletedAt: null, isAdvance: true }, _sum: { amount: true } }),
      prisma.supplierPayment.aggregate({ where: { deletedAt: null, isAdvance: true }, _sum: { amount: true } }),
      prisma.company.findMany({
        where: { deletedAt: null, OR: [{ isBlocked: true }, { creditLimit: { not: null } }] },
        select: { id: true, name: true, isBlocked: true, creditLimit: true },
      }),
    ]);

    const creditLimitAlerts = [];
    for (const c of blockedOrOverLimitCompanies) {
      if (c.isBlocked) {
        creditLimitAlerts.push({ companyId: c.id, companyName: c.name, reason: 'BLOCKED' as const, outstanding: null as number | null, limit: c.creditLimit ? Number(c.creditLimit) : null });
        continue;
      }
      if (c.creditLimit) {
        const outstanding = await prisma.invoice.aggregate({
          where: { companyId: c.id, deletedAt: null, status: { notIn: ['CANCELLED'] } },
          _sum: { outstandingAmount: true },
        });
        const total = Number(outstanding._sum.outstandingAmount || 0);
        if (total > Number(c.creditLimit)) {
          creditLimitAlerts.push({ companyId: c.id, companyName: c.name, reason: 'OVER_LIMIT' as const, outstanding: total, limit: Number(c.creditLimit) });
        }
      }
    }

    return {
      outstandingReceivables: Number(outstandingReceivables._sum.outstandingAmount || 0),
      // Now sourced from SupplierBill (Phase 10) where it exists — falls back
      // to the legacy trip-based estimate for suppliers with no bill yet.
      outstandingPayables: Number(supplierBillOutstanding._sum.outstandingAmount || 0) || totalOutstandingPayables,
      monthlyRevenue,
      monthlyExpenses: monthlyExpensesTotal,
      profit: monthlyRevenue - monthlyExpensesTotal,
      todaysCollection: Number(todaysCollection._sum.amount || 0),
      todaysPayment: Number(todaysPayment._sum.amount || 0),
      overdueReceivablesCount: overdueInvoices,
      overduePayablesCount: overdueBills,
      pendingCollections: pendingReceiptAllocations,
      pendingPayments: overdueBills,
      advanceBalance: {
        customer: Number(advanceReceipts._sum.amount || 0),
        supplier: Number(advancePayments._sum.amount || 0),
      },
      creditLimitAlerts,
      customerOutstanding: customerOutstanding
        .map((c) => ({
          companyId: c.companyId,
          companyName: companyNameMap.get(c.companyId) || 'Unknown',
          outstanding: Number(c._sum.outstandingAmount || 0),
        }))
        .sort((a, b) => b.outstanding - a.outstanding)
        .slice(0, 10),
      supplierOutstanding,
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        paymentNumber: p.paymentNumber,
        supplier: p.supplier.name,
        amount: p.amount,
        paymentDate: p.paymentDate,
      })),
      recentReceipts: recentReceipts.map((r) => ({
        id: r.id,
        receiptNumber: r.receiptNumber,
        company: r.company.name,
        amount: r.amount,
        receiptDate: r.receiptDate,
      })),
    };
  },
};
