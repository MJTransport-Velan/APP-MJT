import { Prisma, InvoiceStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { ReportFilters, dateRangeWhere } from '../utils/reportFilters';
import { ReportDefinition } from '../reports/report.types';

const customerOutstandingReport: ReportDefinition = {
  key: 'customerOutstandingReport',
  label: 'Customer Outstanding Report',
  columns: [
    { key: 'invoiceNumber', label: 'Invoice No.' },
    { key: 'company', label: 'Company' },
    { key: 'totalAmount', label: 'Total' },
    { key: 'paidAmount', label: 'Paid' },
    { key: 'outstandingAmount', label: 'Outstanding' },
    { key: 'dueDate', label: 'Due Date' },
  ],
  run: async (filters, skip, take) => {
    const where: Prisma.InvoiceWhereInput = {
      deletedAt: null,
      outstandingAmount: { gt: 0 },
      status: { notIn: ['CANCELLED'] },
      AND: [filters.companyId ? { companyId: filters.companyId } : {}, dateRangeWhere('invoiceDate', filters)],
    };
    const [rows, total] = await prisma.$transaction([
      prisma.invoice.findMany({
        where,
        include: { company: true },
        orderBy: { outstandingAmount: 'desc' },
        skip,
        take,
      }),
      prisma.invoice.count({ where }),
    ]);
    return {
      rows: rows.map((i) => ({
        invoiceNumber: i.invoiceNumber,
        company: i.company.name,
        totalAmount: i.totalAmount,
        paidAmount: i.paidAmount,
        outstandingAmount: i.outstandingAmount,
        dueDate: i.dueDate,
      })),
      total,
    };
  },
};

const supplierOutstandingReport: ReportDefinition = {
  key: 'supplierOutstandingReport',
  label: 'Supplier Outstanding Report',
  columns: [
    { key: 'supplierName', label: 'Supplier' },
    { key: 'totalCharges', label: 'Total Charges' },
    { key: 'totalPaid', label: 'Total Paid' },
    { key: 'outstanding', label: 'Outstanding' },
  ],
  run: async (filters) => {
    const tripWhereClause: Prisma.TripWhereInput = {
      deletedAt: null,
      status: 'COMPLETED',
      supplierId: filters.supplierId ? filters.supplierId : { not: null },
      ...dateRangeWhere('actualEndDate', filters),
    };
    const trips = await prisma.trip.findMany({
      where: tripWhereClause,
      select: { supplierId: true, supplierRate: true, supplier: true },
    });

    const chargeBySupplier = new Map<string, { name: string; charge: number }>();
    for (const trip of trips) {
      if (!trip.supplierId || !trip.supplier) continue;
      const existing = chargeBySupplier.get(trip.supplierId) || { name: trip.supplier.name, charge: 0 };
      existing.charge += Number(trip.supplierRate || 0);
      chargeBySupplier.set(trip.supplierId, existing);
    }

    const payments = await prisma.supplierPayment.groupBy({
      by: ['supplierId'],
      where: { deletedAt: null, ...(filters.supplierId ? { supplierId: filters.supplierId } : {}) },
      _sum: { amount: true },
    });
    const paidBySupplier = new Map(payments.map((p) => [p.supplierId, Number(p._sum.amount || 0)]));

    const rows = Array.from(chargeBySupplier.entries())
      .map(([supplierId, v]) => ({
        supplierName: v.name,
        totalCharges: v.charge,
        totalPaid: paidBySupplier.get(supplierId) || 0,
        outstanding: v.charge - (paidBySupplier.get(supplierId) || 0),
      }))
      .filter((r) => r.outstanding > 0);

    return { rows, total: rows.length };
  },
};

const invoiceReport: ReportDefinition = {
  key: 'invoiceReport',
  label: 'Invoice Report',
  columns: [
    { key: 'invoiceNumber', label: 'Invoice No.' },
    { key: 'company', label: 'Company' },
    { key: 'status', label: 'Status' },
    { key: 'totalAmount', label: 'Total' },
    { key: 'outstandingAmount', label: 'Outstanding' },
    { key: 'invoiceDate', label: 'Date' },
  ],
  run: async (filters, skip, take) => {
    const where: Prisma.InvoiceWhereInput = {
      deletedAt: null,
      AND: [
        filters.companyId ? { companyId: filters.companyId } : {},
        filters.paymentStatus ? { status: filters.paymentStatus as InvoiceStatus } : {},
        filters.search ? { invoiceNumber: { contains: filters.search, mode: 'insensitive' } } : {},
        dateRangeWhere('invoiceDate', filters),
      ],
    };
    const [rows, total] = await prisma.$transaction([
      prisma.invoice.findMany({ where, include: { company: true }, orderBy: { invoiceDate: 'desc' }, skip, take }),
      prisma.invoice.count({ where }),
    ]);
    return {
      rows: rows.map((i) => ({
        invoiceNumber: i.invoiceNumber,
        company: i.company.name,
        status: i.status,
        totalAmount: i.totalAmount,
        outstandingAmount: i.outstandingAmount,
        invoiceDate: i.invoiceDate,
      })),
      total,
    };
  },
};

const receiptReport: ReportDefinition = {
  key: 'receiptReport',
  label: 'Receipt Report',
  columns: [
    { key: 'receiptNumber', label: 'Receipt No.' },
    { key: 'company', label: 'Company' },
    { key: 'invoice', label: 'Invoice' },
    { key: 'amount', label: 'Amount' },
    { key: 'receiptDate', label: 'Date' },
  ],
  run: async (filters, skip, take) => {
    const where: Prisma.ReceiptWhereInput = {
      deletedAt: null,
      AND: [filters.companyId ? { companyId: filters.companyId } : {}, dateRangeWhere('receiptDate', filters)],
    };
    const [rows, total] = await prisma.$transaction([
      prisma.receipt.findMany({
        where,
        include: { company: true, invoice: true },
        orderBy: { receiptDate: 'desc' },
        skip,
        take,
      }),
      prisma.receipt.count({ where }),
    ]);
    return {
      rows: rows.map((r) => ({
        receiptNumber: r.receiptNumber,
        company: r.company.name,
        invoice: r.invoice?.invoiceNumber || '-',
        amount: r.amount,
        receiptDate: r.receiptDate,
      })),
      total,
    };
  },
};

const paymentReport: ReportDefinition = {
  key: 'paymentReport',
  label: 'Payment Report',
  columns: [
    { key: 'paymentNumber', label: 'Payment No.' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'trip', label: 'Trip' },
    { key: 'amount', label: 'Amount' },
    { key: 'paymentDate', label: 'Date' },
  ],
  run: async (filters, skip, take) => {
    const where: Prisma.SupplierPaymentWhereInput = {
      deletedAt: null,
      AND: [filters.supplierId ? { supplierId: filters.supplierId } : {}, dateRangeWhere('paymentDate', filters)],
    };
    const [rows, total] = await prisma.$transaction([
      prisma.supplierPayment.findMany({
        where,
        include: { supplier: true, trip: true },
        orderBy: { paymentDate: 'desc' },
        skip,
        take,
      }),
      prisma.supplierPayment.count({ where }),
    ]);
    return {
      rows: rows.map((p) => ({
        paymentNumber: p.paymentNumber,
        supplier: p.supplier.name,
        trip: p.trip?.tripNumber || '-',
        amount: p.amount,
        paymentDate: p.paymentDate,
      })),
      total,
    };
  },
};

const tripProfitabilityReport: ReportDefinition = {
  key: 'tripProfitabilityReport',
  label: 'Trip Profitability Report',
  columns: [
    { key: 'tripNumber', label: 'Trip No.' },
    { key: 'company', label: 'Company' },
    { key: 'income', label: 'Revenue' },
    { key: 'tripExpenses', label: 'Trip Expenses' },
    { key: 'supplierCharges', label: 'Supplier Charges' },
    { key: 'profit', label: 'Profit' },
  ],
  run: async (filters, skip, take) => {
    const where: Prisma.TripWhereInput = {
      deletedAt: null,
      status: 'COMPLETED',
      AND: [
        filters.companyId ? { intent: { companyId: filters.companyId } } : {},
        filters.vehicleId ? { vehicleId: filters.vehicleId } : {},
        dateRangeWhere('actualEndDate', filters),
      ],
    };
    const [rows, total] = await prisma.$transaction([
      prisma.trip.findMany({
        where,
        include: { intent: { include: { company: true } }, expenses: { where: { deletedAt: null } } },
        orderBy: { actualEndDate: 'desc' },
        skip,
        take,
      }),
      prisma.trip.count({ where }),
    ]);
    return {
      rows: rows.map((t) => {
        const income = Number(t.freightAmount || 0);
        const tripExpenses = t.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
        const supplierCharges = Number(t.supplierRate || 0);
        return {
          tripNumber: t.tripNumber,
          company: t.intent.company.name,
          income,
          tripExpenses,
          supplierCharges,
          profit: income - tripExpenses - supplierCharges,
        };
      }),
      total,
    };
  },
};

const revenueReport: ReportDefinition = {
  key: 'revenueReport',
  label: 'Revenue Report',
  columns: [
    { key: 'tripNumber', label: 'Trip No.' },
    { key: 'company', label: 'Company' },
    { key: 'freightAmount', label: 'Revenue' },
    { key: 'actualEndDate', label: 'Completed On' },
  ],
  run: async (filters, skip, take) => {
    const where: Prisma.TripWhereInput = {
      deletedAt: null,
      status: 'COMPLETED',
      AND: [filters.companyId ? { intent: { companyId: filters.companyId } } : {}, dateRangeWhere('actualEndDate', filters)],
    };
    const [rows, total] = await prisma.$transaction([
      prisma.trip.findMany({
        where,
        include: { intent: { include: { company: true } } },
        orderBy: { actualEndDate: 'desc' },
        skip,
        take,
      }),
      prisma.trip.count({ where }),
    ]);
    return {
      rows: rows.map((t) => ({
        tripNumber: t.tripNumber,
        company: t.intent.company.name,
        freightAmount: t.freightAmount,
        actualEndDate: t.actualEndDate,
      })),
      total,
    };
  },
};

const expenseReport: ReportDefinition = {
  key: 'expenseReport',
  label: 'Expense Report',
  columns: [
    { key: 'tripNumber', label: 'Trip No.' },
    { key: 'category', label: 'Category' },
    { key: 'amount', label: 'Amount' },
    { key: 'expenseDate', label: 'Date' },
  ],
  run: async (filters, skip, take) => {
    const where: Prisma.TripExpenseWhereInput = {
      deletedAt: null,
      AND: [filters.vehicleId ? { trip: { vehicleId: filters.vehicleId } } : {}, dateRangeWhere('expenseDate', filters)],
    };
    const [rows, total] = await prisma.$transaction([
      prisma.tripExpense.findMany({
        where,
        include: { trip: true },
        orderBy: { expenseDate: 'desc' },
        skip,
        take,
      }),
      prisma.tripExpense.count({ where }),
    ]);
    return {
      rows: rows.map((e) => ({
        tripNumber: e.trip.tripNumber,
        category: e.category,
        amount: e.amount,
        expenseDate: e.expenseDate,
      })),
      total,
    };
  },
};

export const accountsReportRepository: Record<string, ReportDefinition> = {
  customerOutstandingReport,
  supplierOutstandingReport,
  invoiceReport,
  receiptReport,
  paymentReport,
  tripProfitabilityReport,
  revenueReport,
  expenseReport,
};
