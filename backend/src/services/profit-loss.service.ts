/**
 * Finance → Profit & Loss: a read-only Income/Expenses/Net Profit report
 * for a selected period, computed entirely from existing tables — no
 * ledger/voucher/P&L-account concept is introduced, and no cumulative
 * "Opening Balance" retained-earnings figure is tracked (this system has
 * none — see balance-sheet.service.ts's Net Position for why). This
 * report only ever shows ONE period's activity at a time.
 *
 * Income = Trip Revenue (freightAmount on trips completed in the period)
 *   + Other Income (refunds received in the period).
 * Expenses = Trip-related Cost (market-vehicle supplier cost + manual
 *   TripExpense rows for those trips) + Vehicle Operating Cost
 *   (Diesel/FASTag/Repairs/Insurance/Tyres/Battery/Driver Salary/Other,
 *   fleet-wide, same category buckets as financial-state.service.ts's
 *   vehicleState()) + Office Expenses (FinancialEntry EXPENSE/OFFICE_EXPENSE)
 *   + Interest & Finance Charges (interest component of LoanInstallments
 *   paid in the period) + Staff Salary (EmployeeSalaryPayment rows).
 */
import { prisma } from '../config/db';
import { AppError } from '../middlewares/error.middleware';
import { dateRangeWhere } from '../utils/reportFilters';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// Builds YYYY-MM-DD from LOCAL date parts directly — going through
// toISOString() here would convert to UTC first, which silently shifts
// the date backward by one day for any server running east of UTC (e.g.
// IST, UTC+5:30) whenever local midnight hasn't yet reached UTC midnight.
function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function resolvePeriod(fromInput?: string, toInput?: string) {
  const today = new Date();
  const defaultFrom = toDateStr(new Date(today.getFullYear(), today.getMonth(), 1));
  const defaultTo = toDateStr(today);
  const from = fromInput || defaultFrom;
  const to = toInput || defaultTo;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) throw new AppError('from/to must be YYYY-MM-DD', 422);
  if (from > to) throw new AppError('from date must not be after to date', 422);
  return { from, to, dateFrom: new Date(`${from}T00:00:00.000Z`), dateTo: new Date(`${to}T23:59:59.999Z`) };
}

export const profitLossService = {
  async get(query: { from?: string; to?: string }) {
    const { from, to, dateFrom, dateTo } = resolvePeriod(query.from, query.to);
    const range = { dateFrom, dateTo };

    const [tripAgg, otherIncomeAgg, tripExpenseAgg, vehicleExpenses, officeExpenseAgg, interestAgg, salaryPaymentAgg] = await Promise.all([
      prisma.trip.aggregate({
        where: { deletedAt: null, status: 'COMPLETED', ...dateRangeWhere('actualEndDate', range) },
        _sum: { freightAmount: true, supplierRate: true },
      }),
      prisma.financialEntry.aggregate({
        where: { entryType: 'REFUND_RECEIVED', status: { notIn: ['CANCELLED'] }, deletedAt: null, ...dateRangeWhere('entryDate', range) },
        _sum: { amount: true },
      }),
      prisma.tripExpense.aggregate({
        where: { deletedAt: null, ...dateRangeWhere('expenseDate', range) },
        _sum: { amount: true },
      }),
      prisma.vehicleExpense.findMany({
        where: { deletedAt: null, ...dateRangeWhere('expenseDate', range) },
        select: { category: true, amount: true },
      }),
      prisma.financialEntry.aggregate({
        where: { entryType: 'EXPENSE', purpose: 'OFFICE_EXPENSE', status: { notIn: ['CANCELLED'] }, deletedAt: null, ...dateRangeWhere('entryDate', range) },
        _sum: { amount: true },
      }),
      prisma.loanInstallment.aggregate({
        where: { status: 'PAID', ...dateRangeWhere('paidDate', range) },
        _sum: { interestComponent: true },
      }),
      prisma.employeeSalaryPayment.aggregate({
        where: dateRangeWhere('paidDate', range),
        _sum: { amount: true },
      }),
    ]);

    const tripRevenue = round2(Number(tripAgg._sum.freightAmount ?? 0));
    const otherIncome = round2(Number(otherIncomeAgg._sum.amount ?? 0));
    const totalIncome = round2(tripRevenue + otherIncome);

    const tripSupplierCost = round2(Number(tripAgg._sum.supplierRate ?? 0));
    const tripManualExpense = round2(Number(tripExpenseAgg._sum.amount ?? 0));
    const tripRelatedCost = round2(tripSupplierCost + tripManualExpense);

    const buckets = { fastTag: 0, diesel: 0, repairs: 0, insurance: 0, tyres: 0, battery: 0, driverSalary: 0, other: 0 };
    const REPAIR_CATEGORIES = ['REPAIR', 'SERVICE', 'BREAKDOWN', 'MAINTENANCE'];
    for (const e of vehicleExpenses) {
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
    const vehicleOperatingTotal = round2(Object.values(buckets).reduce((s, v) => s + v, 0));

    const officeExpenses = round2(Number(officeExpenseAgg._sum.amount ?? 0));
    // Only the interest half of an EMI is an expense — the principal half
    // repays a liability and never touches P&L.
    const interestAndFinanceCharges = round2(Number(interestAgg._sum.interestComponent ?? 0));
    const staffSalary = round2(Number(salaryPaymentAgg._sum.amount ?? 0));

    const totalExpenses = round2(tripRelatedCost + vehicleOperatingTotal + officeExpenses + interestAndFinanceCharges + staffSalary);
    const netProfit = round2(totalIncome - totalExpenses);

    return {
      period: { from, to },
      income: {
        tripRevenue,
        otherIncome,
        total: totalIncome,
      },
      expenses: {
        tripRelatedCost: { supplierCost: tripSupplierCost, manualTripExpenses: tripManualExpense, total: tripRelatedCost },
        vehicleOperatingCost: { ...buckets, total: vehicleOperatingTotal },
        officeExpenses,
        interestAndFinanceCharges,
        staffSalary,
        total: totalExpenses,
      },
      netProfit,
      profitMarginPercent: totalIncome > 0 ? round2((netProfit / totalIncome) * 100) : 0,
      limitations: [
        'Trip Revenue/Cost is recognized when a trip is marked COMPLETED within the selected period (by its actual end date) — a trip completed outside the period contributes nothing here even if invoiced/paid within it.',
        'Manual Trip Expense entries (Operations → Trip Expenses) and Vehicle Operating Cost (Diesel/FASTag/Repairs/...) are two separate, currently-unlinked ways this app can record the same kind of cost — if the same expense was ever logged in both places, it is counted twice here.',
        'Office Expenses only include Financial Entries recorded with purpose "Office Expense" — cash-basis, not a full accrual expense ledger.',
      ],
    };
  },
};
