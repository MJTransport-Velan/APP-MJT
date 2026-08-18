/**
 * Read-only "current state" views in business language (Total Billed/
 * Received/Advance/Outstanding/Available Balance...) for Customer/Supplier/
 * Driver/Employee/Bank/Cash plus a unified dashboard. Composes the existing
 * accrual tables (Invoice/SupplierBill/Receipt/SupplierPayment/
 * DriverAdvance/EmployeeAdvance) and, for Bank/Cash, their own directly
 * stored currentBalance — there is no ledger to cross-check against in
 * this model, so these direct-table sums are the only source of truth.
 */
import { prisma } from '../config/db';
import { AppError } from '../middlewares/error.middleware';
import { organizationService } from './organization.service';

const round2 = (n: number) => Number(n.toFixed(2));

export const financialStateService = {
  /** Total Billed / Received / Advance / Adjusted / Outstanding / Overdue / Refund. */
  async customerState(companyId: string) {
    const company = await prisma.company.findFirst({ where: { id: companyId, deletedAt: null } });
    if (!company) throw new AppError('Customer not found', 404);

    const [billed, received, outstanding, overdue, advance, adjusted, refund] = await Promise.all([
      prisma.invoice.aggregate({ where: { companyId, deletedAt: null, status: { not: 'CANCELLED' } }, _sum: { totalAmount: true } }),
      prisma.receipt.aggregate({ where: { companyId, deletedAt: null }, _sum: { amount: true } }),
      prisma.invoice.aggregate({ where: { companyId, deletedAt: null, status: { not: 'CANCELLED' } }, _sum: { outstandingAmount: true } }),
      prisma.invoice.aggregate({
        where: { companyId, deletedAt: null, status: { not: 'CANCELLED' }, outstandingAmount: { gt: 0 }, dueDate: { lt: new Date() } },
        _sum: { outstandingAmount: true },
      }),
      prisma.receipt.aggregate({ where: { companyId, deletedAt: null, isAdvance: true }, _sum: { amount: true } }),
      prisma.creditNote.aggregate({ where: { invoice: { companyId }, isActive: true, deletedAt: null }, _sum: { amount: true } }),
      prisma.financialEntry.aggregate({
        where: { sourceType: 'CUSTOMER', sourceId: companyId, entryType: 'REFUND_RECEIVED', status: { notIn: ['CANCELLED'] }, deletedAt: null },
        _sum: { amount: true },
      }),
    ]);

    return {
      customer: { id: company.id, name: company.name },
      totalBilled: round2(Number(billed._sum.totalAmount ?? 0)),
      totalReceived: round2(Number(received._sum.amount ?? 0)),
      advance: round2(Number(advance._sum.amount ?? 0)),
      adjusted: round2(Number(adjusted._sum.amount ?? 0)),
      outstanding: round2(Number(outstanding._sum.outstandingAmount ?? 0)),
      overdue: round2(Number(overdue._sum.outstandingAmount ?? 0)),
      refund: round2(Number(refund._sum.amount ?? 0)),
    };
  },

  /** Total Payable / Paid / Advance / Adjusted / Outstanding / Overdue / Refund. */
  async supplierState(supplierId: string) {
    const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, deletedAt: null } });
    if (!supplier) throw new AppError('Supplier not found', 404);

    const [payable, paid, outstanding, overdue, advance, adjusted, refund] = await Promise.all([
      prisma.supplierBill.aggregate({ where: { supplierId, deletedAt: null, status: { not: 'CANCELLED' } }, _sum: { totalAmount: true } }),
      prisma.supplierPayment.aggregate({ where: { supplierId, deletedAt: null }, _sum: { amount: true } }),
      prisma.supplierBill.aggregate({ where: { supplierId, deletedAt: null, status: { not: 'CANCELLED' } }, _sum: { outstandingAmount: true } }),
      prisma.supplierBill.aggregate({
        where: { supplierId, deletedAt: null, status: { not: 'CANCELLED' }, outstandingAmount: { gt: 0 }, dueDate: { lt: new Date() } },
        _sum: { outstandingAmount: true },
      }),
      prisma.supplierPayment.aggregate({ where: { supplierId, deletedAt: null, isAdvance: true }, _sum: { amount: true } }),
      prisma.supplierCreditNote.aggregate({ where: { bill: { supplierId }, isActive: true, deletedAt: null }, _sum: { amount: true } }),
      prisma.financialEntry.aggregate({
        where: { destinationType: 'SUPPLIER', destinationId: supplierId, entryType: 'REFUND_RECEIVED', status: { notIn: ['CANCELLED'] }, deletedAt: null },
        _sum: { amount: true },
      }),
    ]);

    return {
      supplier: { id: supplier.id, name: supplier.name },
      totalPayable: round2(Number(payable._sum.totalAmount ?? 0)),
      totalPaid: round2(Number(paid._sum.amount ?? 0)),
      advance: round2(Number(advance._sum.amount ?? 0)),
      adjusted: round2(Number(adjusted._sum.amount ?? 0)),
      outstanding: round2(Number(outstanding._sum.outstandingAmount ?? 0)),
      overdue: round2(Number(overdue._sum.outstandingAmount ?? 0)),
      refund: round2(Number(refund._sum.amount ?? 0)),
    };
  },

  /** Advance / Adjusted (settled) / Remaining unsettled. */
  async driverState(driverId: string) {
    const driver = await prisma.driver.findFirst({ where: { id: driverId, deletedAt: null } });
    if (!driver) throw new AppError('Driver not found', 404);

    const [advanceGiven, settled, unsettled] = await Promise.all([
      prisma.driverAdvance.aggregate({ where: { driverId, deletedAt: null, approvalStatus: 'APPROVED' }, _sum: { amount: true } }),
      prisma.driverAdvance.aggregate({ where: { driverId, deletedAt: null, approvalStatus: 'APPROVED', isSettled: true }, _sum: { amount: true } }),
      prisma.driverAdvance.aggregate({ where: { driverId, deletedAt: null, approvalStatus: 'APPROVED', isSettled: false }, _sum: { amount: true } }),
    ]);

    return {
      driver: { id: driver.id, name: driver.name, code: driver.code },
      totalAdvance: round2(Number(advanceGiven._sum.amount ?? 0)),
      adjusted: round2(Number(settled._sum.amount ?? 0)),
      remaining: round2(Number(unsettled._sum.amount ?? 0)),
    };
  },

  async employeeState(employeeId: string) {
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, deletedAt: null } });
    if (!employee) throw new AppError('Employee not found', 404);

    const [advanceGiven, settled, unsettled] = await Promise.all([
      prisma.employeeAdvance.aggregate({ where: { employeeId, deletedAt: null, approvalStatus: 'APPROVED' }, _sum: { amount: true } }),
      prisma.employeeAdvance.aggregate({ where: { employeeId, deletedAt: null, approvalStatus: 'APPROVED', isSettled: true }, _sum: { amount: true } }),
      prisma.employeeAdvance.aggregate({ where: { employeeId, deletedAt: null, approvalStatus: 'APPROVED', isSettled: false }, _sum: { amount: true } }),
    ]);

    return {
      employee: { id: employee.id, name: employee.name, employeeCode: employee.employeeCode },
      totalAdvance: round2(Number(advanceGiven._sum.amount ?? 0)),
      adjusted: round2(Number(settled._sum.amount ?? 0)),
      remaining: round2(Number(unsettled._sum.amount ?? 0)),
    };
  },

  /**
   * Vehicle Operating Cost broken out by category — FASTag and Diesel/Fuel
   * are deliberately kept as their own numbers rather than folded into one
   * generic "expenses" total (design brief: "Do NOT combine FASTag and
   * Diesel into one expense number"). Sourced entirely from VehicleExpense,
   * which every dedicated module (FuelEntry, FastTagTransaction,
   * MaintenanceRecord, VehicleTyre, VehicleBattery, manual entries) already
   * mirrors into via vehicleExpenseInternalService.logFromSource.
   */
  async vehicleState(vehicleId: string) {
    const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, deletedAt: null } });
    if (!vehicle) throw new AppError('Vehicle not found', 404);

    const expenses = await prisma.vehicleExpense.findMany({
      where: { vehicleId, deletedAt: null },
      select: { category: true, amount: true },
    });

    const buckets = { fastTag: 0, diesel: 0, repairs: 0, insurance: 0, tyres: 0, battery: 0, driverSalary: 0, other: 0 };
    const REPAIR_CATEGORIES = ['REPAIR', 'SERVICE', 'BREAKDOWN', 'MAINTENANCE'];
    for (const e of expenses) {
      const amount = Number(e.amount);
      if (e.category === 'FASTTAG') buckets.fastTag += amount;
      else if (e.category === 'FUEL') buckets.diesel += amount;
      else if (REPAIR_CATEGORIES.includes(e.category)) buckets.repairs += amount;
      else if (e.category === 'INSURANCE') buckets.insurance += amount;
      else if (e.category === 'TYRE') buckets.tyres += amount;
      else if (e.category === 'BATTERY') buckets.battery += amount;
      else if (e.category === 'DRIVER_SALARY') buckets.driverSalary += amount;
      else buckets.other += amount;
    }

    const totalOperatingCost = round2(
      buckets.fastTag +
        buckets.diesel +
        buckets.repairs +
        buckets.insurance +
        buckets.tyres +
        buckets.battery +
        buckets.driverSalary +
        buckets.other
    );

    return {
      vehicle: { id: vehicle.id, registrationNumber: vehicle.registrationNumber },
      fastTag: round2(buckets.fastTag),
      diesel: round2(buckets.diesel),
      repairs: round2(buckets.repairs),
      insurance: round2(buckets.insurance),
      tyres: round2(buckets.tyres),
      battery: round2(buckets.battery),
      driverSalary: round2(buckets.driverSalary),
      other: round2(buckets.other),
      totalOperatingCost,
    };
  },

  /** Opening + Received - Paid = Current, per Bank/Cash account — read directly off currentBalance, no ledger required. */
  async bankAndCashState(organizationId: string | undefined) {
    const orgId = await organizationService.resolveOrganizationId(organizationId);

    const [bankAccounts, cashAccounts] = await Promise.all([
      prisma.bankAccount.findMany({
        where: { organizationId: orgId, deletedAt: null, isActive: true },
        select: { id: true, accountHolderName: true, accountNumber: true, bankName: true, openingBalance: true, currentBalance: true },
      }),
      prisma.cashAccount.findMany({
        where: { organizationId: orgId, deletedAt: null, isActive: true },
        select: { id: true, cashAccountType: true, openingBalance: true, currentBalance: true },
      }),
    ]);

    const banks = bankAccounts.map((b) => ({
      id: b.id,
      name: b.accountHolderName,
      bankName: b.bankName,
      accountNumber: b.accountNumber,
      openingBalance: round2(Number(b.openingBalance)),
      currentBalance: round2(Number(b.currentBalance)),
    }));
    const cash = cashAccounts.map((c) => ({
      id: c.id,
      name: c.cashAccountType,
      openingBalance: round2(Number(c.openingBalance)),
      currentBalance: round2(Number(c.currentBalance)),
    }));

    return {
      bankAccounts: banks,
      cashAccounts: cash,
      totalBankBalance: round2(banks.reduce((s, b) => s + b.currentBalance, 0)),
      totalCashBalance: round2(cash.reduce((s, c) => s + c.currentBalance, 0)),
    };
  },

  /** Money In / Money Out / Cash & Bank Available / Outstanding — the one screen a business owner reads. */
  async dashboard(query: { from?: string; to?: string }) {
    const from = query.from ? new Date(`${query.from}T00:00:00.000Z`) : undefined;
    const to = query.to ? new Date(`${query.to}T23:59:59.999Z`) : undefined;
    const dateFilter = from || to ? { entryDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {};

    const [moneyIn, moneyOut, custOutstanding, suppOutstanding, driverAdvances, employeeAdvances, fundState] = await Promise.all([
      prisma.financialEntry.aggregate({
        where: { ...dateFilter, entryType: { in: ['MONEY_RECEIVED', 'ADVANCE_RECEIVED', 'REFUND_RECEIVED', 'LOAN_RECEIVED'] }, status: { notIn: ['CANCELLED'] }, deletedAt: null },
        _sum: { amount: true },
      }),
      prisma.financialEntry.aggregate({
        where: { ...dateFilter, entryType: { in: ['MONEY_PAID', 'ADVANCE_GIVEN', 'REFUND_PAID', 'LOAN_REPAYMENT', 'EXPENSE', 'SALARY_SETTLEMENT'] }, status: { notIn: ['CANCELLED'] }, deletedAt: null },
        _sum: { amount: true },
      }),
      prisma.invoice.aggregate({ where: { deletedAt: null, status: { not: 'CANCELLED' } }, _sum: { outstandingAmount: true } }),
      prisma.supplierBill.aggregate({ where: { deletedAt: null, status: { not: 'CANCELLED' } }, _sum: { outstandingAmount: true } }),
      prisma.driverAdvance.aggregate({ where: { deletedAt: null, approvalStatus: 'APPROVED', isSettled: false }, _sum: { amount: true } }),
      prisma.employeeAdvance.aggregate({ where: { deletedAt: null, approvalStatus: 'APPROVED', isSettled: false }, _sum: { amount: true } }),
      financialStateService.bankAndCashState(undefined),
    ]);

    const tripAgg = await prisma.trip.aggregate({
      where: { deletedAt: null, status: 'COMPLETED', ...(from || to ? { updatedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}) },
      _sum: { freightAmount: true, supplierRate: true },
    });
    const tripExpenseAgg = await prisma.tripExpense.aggregate({
      where: { deletedAt: null, ...(from || to ? { expenseDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}) },
      _sum: { amount: true },
    });

    const tripRevenue = round2(Number(tripAgg._sum.freightAmount ?? 0));
    const tripSupplierCost = round2(Number(tripAgg._sum.supplierRate ?? 0));
    const tripExpense = round2(Number(tripExpenseAgg._sum.amount ?? 0));
    const tripCost = round2(tripSupplierCost + tripExpense);

    return {
      moneyIn: round2(Number(moneyIn._sum.amount ?? 0)),
      moneyOut: round2(Number(moneyOut._sum.amount ?? 0)),
      cashAvailable: fundState.totalCashBalance,
      bankAvailable: fundState.totalBankBalance,
      customerOutstanding: round2(Number(custOutstanding._sum.outstandingAmount ?? 0)),
      supplierOutstanding: round2(Number(suppOutstanding._sum.outstandingAmount ?? 0)),
      driverAdvances: round2(Number(driverAdvances._sum.amount ?? 0)),
      employeeAdvances: round2(Number(employeeAdvances._sum.amount ?? 0)),
      tripRevenue,
      tripCost,
      tripProfit: round2(tripRevenue - tripCost),
    };
  },
};
