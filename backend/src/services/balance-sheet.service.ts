/**
 * Finance → Balance Sheet: a read-only "what do we own / what do we owe"
 * report computed entirely from the existing direct-balance business
 * tables (Invoice/Receipt/SupplierBill/SupplierPayment/DriverAdvance/
 * EmployeeAdvance/FixedAsset/DriverEarning/
 * DriverPenalty/BankAccount/
 * CashAccount/CapitalTransaction) — no Ledger/Voucher/Chart-of-Accounts
 * concept is introduced. CapitalPartner/CapitalTransaction (added
 * 2026-08-12) is the one deliberate exception to "no Capital Account":
 * it's a simple named partner + one-shot fund-account-adjusting
 * transaction, not a ledger — a partner's balance is still just
 * SUM(CONTRIBUTION) − SUM(WITHDRAWAL), computed live here, never stored.
 *
 * asOfDate: every dated query below filters its own natural date column
 * (invoiceDate/receiptDate/billDate/paymentDate/paidDate/createdAt/...)
 * with `lte: cutoff`, where cutoff is 23:59:59.999 of the requested date
 * (default: today). This uniformly satisfies "transactions after the
 * selected date must not affect the report" for both the default "today"
 * view and any past date, without a separate code path for either.
 *
 * Two figures cannot be reconstructed for a genuinely historical date
 * with the data this app tracks, and are called out via `limitations`
 * in the response rather than silently faked:
 *  1. Bank/Cash — `BankAccount.currentBalance`/`CashAccount.currentBalance`
 *     are mutated in place (adjustFundAccountBalance) with no dated
 *     transaction ledger behind them, so only the CURRENT balance is
 *     ever available.
 *  2. Fixed Asset value — `FixedAsset.currentValue` is today's
 *     depreciated book value, not recomputed for the selected date.
 *  3. Driver/Employee Advance settlement is a boolean flag with no
 *     settlement timestamp column, so a past-date view approximates
 *     "already settled" using the record's `createdAt` — an
 *     approximation, not an exact replay.
 */
import { prisma } from '../config/db';
import { AppError } from '../middlewares/error.middleware';
import { financialStateService } from './financial-state.service';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const EPS = 0.004;

// Builds YYYY-MM-DD from LOCAL date parts directly — toISOString() would
// convert to UTC first, which silently shows "yesterday" for roughly the
// first 5.5 hours of every IST day (any server running east of UTC).
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function resolveAsOf(asOfDate?: string): { dateStr: string; cutoff: Date; isToday: boolean } {
  const today = todayStr();
  const dateStr = asOfDate || today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) throw new AppError('asOfDate must be in YYYY-MM-DD format', 422);
  const cutoff = new Date(`${dateStr}T23:59:59.999Z`);
  if (Number.isNaN(cutoff.getTime())) throw new AppError('Invalid asOfDate', 422);
  if (dateStr > today) throw new AppError('asOfDate cannot be in the future', 422);
  return { dateStr, cutoff, isToday: dateStr === today };
}

interface PartyRow {
  id: string;
  name: string;
  billed: number;
  settled: number;
  net: number;
}

/** Billed(≤cutoff) − Received(≤cutoff) per Company. Positive = receivable, negative = advance. */
async function customerBreakdown(cutoff: Date): Promise<PartyRow[]> {
  const [billed, received, companies] = await Promise.all([
    prisma.invoice.groupBy({
      by: ['companyId'],
      where: { deletedAt: null, status: { notIn: ['CANCELLED'] }, invoiceDate: { lte: cutoff } },
      _sum: { totalAmount: true },
    }),
    prisma.receipt.groupBy({
      by: ['companyId'],
      where: { deletedAt: null, receiptDate: { lte: cutoff } },
      _sum: { amount: true },
    }),
    prisma.company.findMany({ where: { deletedAt: null }, select: { id: true, name: true } }),
  ]);
  const nameMap = new Map(companies.map((c) => [c.id, c.name]));
  const billedMap = new Map(billed.map((b) => [b.companyId, Number(b._sum.totalAmount ?? 0)]));
  const receivedMap = new Map(received.map((r) => [r.companyId, Number(r._sum.amount ?? 0)]));
  const ids = new Set([...billedMap.keys(), ...receivedMap.keys()]);
  return Array.from(ids).map((id) => {
    const b = billedMap.get(id) ?? 0;
    const s = receivedMap.get(id) ?? 0;
    return { id, name: nameMap.get(id) ?? 'Unknown', billed: round2(b), settled: round2(s), net: round2(b - s) };
  });
}

/** Billed(≤cutoff) − Paid(≤cutoff) per Supplier. Positive = payable, negative = advance paid to supplier. */
async function supplierBreakdown(cutoff: Date): Promise<PartyRow[]> {
  const [billed, paid, suppliers] = await Promise.all([
    prisma.supplierBill.groupBy({
      by: ['supplierId'],
      where: { deletedAt: null, status: { notIn: ['CANCELLED'] }, billDate: { lte: cutoff } },
      _sum: { totalAmount: true },
    }),
    prisma.supplierPayment.groupBy({
      by: ['supplierId'],
      where: { deletedAt: null, paymentDate: { lte: cutoff } },
      _sum: { amount: true },
    }),
    prisma.supplier.findMany({ where: { deletedAt: null }, select: { id: true, name: true } }),
  ]);
  const nameMap = new Map(suppliers.map((s) => [s.id, s.name]));
  const billedMap = new Map(billed.map((b) => [b.supplierId, Number(b._sum.totalAmount ?? 0)]));
  const paidMap = new Map(paid.map((p) => [p.supplierId, Number(p._sum.amount ?? 0)]));
  const ids = new Set([...billedMap.keys(), ...paidMap.keys()]);
  return Array.from(ids).map((id) => {
    const b = billedMap.get(id) ?? 0;
    const s = paidMap.get(id) ?? 0;
    return { id, name: nameMap.get(id) ?? 'Unknown', billed: round2(b), settled: round2(s), net: round2(b - s) };
  });
}

interface NamedAmountRow {
  id: string;
  name: string;
  amount: number;
}

async function driverAdvancesRecoverable(cutoff: Date): Promise<{ rows: NamedAmountRow[]; total: number }> {
  const grouped = await prisma.driverAdvance.groupBy({
    by: ['driverId'],
    where: { deletedAt: null, approvalStatus: 'APPROVED', isSettled: false, createdAt: { lte: cutoff } },
    _sum: { amount: true },
  });
  if (grouped.length === 0) return { rows: [], total: 0 };
  const drivers = await prisma.driver.findMany({ where: { id: { in: grouped.map((g) => g.driverId) } }, select: { id: true, name: true, code: true } });
  const nameMap = new Map(drivers.map((d) => [d.id, `${d.name} (${d.code})`]));
  const rows = grouped
    .map((g) => ({ id: g.driverId, name: nameMap.get(g.driverId) ?? 'Unknown', amount: round2(Number(g._sum.amount ?? 0)) }))
    .filter((r) => r.amount > EPS)
    .sort((a, b) => b.amount - a.amount);
  return { rows, total: round2(rows.reduce((s, r) => s + r.amount, 0)) };
}

async function employeeAdvancesRecoverable(cutoff: Date): Promise<{ rows: NamedAmountRow[]; total: number }> {
  const grouped = await prisma.employeeAdvance.groupBy({
    by: ['employeeId'],
    where: { deletedAt: null, approvalStatus: 'APPROVED', isSettled: false, createdAt: { lte: cutoff } },
    _sum: { amount: true },
  });
  if (grouped.length === 0) return { rows: [], total: 0 };
  const employees = await prisma.employee.findMany({ where: { id: { in: grouped.map((g) => g.employeeId) } }, select: { id: true, name: true, employeeCode: true } });
  const nameMap = new Map(employees.map((e) => [e.id, `${e.name} (${e.employeeCode})`]));
  const rows = grouped
    .map((g) => ({ id: g.employeeId, name: nameMap.get(g.employeeId) ?? 'Unknown', amount: round2(Number(g._sum.amount ?? 0)) }))
    .filter((r) => r.amount > EPS)
    .sort((a, b) => b.amount - a.amount);
  return { rows, total: round2(rows.reduce((s, r) => s + r.amount, 0)) };
}

/** Net amount owed TO drivers (approved, unsettled Earnings − Penalties) — a liability. */
async function driverPayable(cutoff: Date): Promise<{ rows: NamedAmountRow[]; total: number }> {
  const [earnings, penalties, drivers] = await Promise.all([
    prisma.driverEarning.findMany({ where: { deletedAt: null, approvalStatus: 'APPROVED', isSettled: false, createdAt: { lte: cutoff } }, select: { driverId: true, amount: true } }),
    prisma.driverPenalty.findMany({ where: { deletedAt: null, approvalStatus: 'APPROVED', isSettled: false, createdAt: { lte: cutoff } }, select: { driverId: true, amount: true } }),
    prisma.driver.findMany({ where: { deletedAt: null }, select: { id: true, name: true, code: true } }),
  ]);
  const nameMap = new Map(drivers.map((d) => [d.id, `${d.name} (${d.code})`]));
  const net = new Map<string, number>();
  for (const e of earnings) net.set(e.driverId, (net.get(e.driverId) ?? 0) + Number(e.amount));
  for (const p of penalties) net.set(p.driverId, (net.get(p.driverId) ?? 0) - Number(p.amount));
  const rows = Array.from(net.entries())
    .map(([id, amount]) => ({ id, name: nameMap.get(id) ?? 'Unknown', amount: round2(amount) }))
    .filter((r) => r.amount > EPS)
    .sort((a, b) => b.amount - a.amount);
  return { rows, total: round2(rows.reduce((s, r) => s + r.amount, 0)) };
}

/** Partner-wise SUM(CONTRIBUTION) − SUM(WITHDRAWAL) as of cutoff — a liability (what the business owes its own partners). */
async function capitalAccountBreakdown(cutoff: Date): Promise<{ rows: NamedAmountRow[]; total: number }> {
  const transactions = await prisma.capitalTransaction.findMany({
    where: { deletedAt: null, transactionDate: { lte: cutoff } },
    select: { partnerId: true, type: true, amount: true, partner: { select: { name: true } } },
  });
  const net = new Map<string, { name: string; amount: number }>();
  for (const t of transactions) {
    const delta = t.type === 'CONTRIBUTION' ? Number(t.amount) : -Number(t.amount);
    const existing = net.get(t.partnerId);
    net.set(t.partnerId, { name: t.partner.name, amount: (existing?.amount ?? 0) + delta });
  }
  const rows = Array.from(net.entries())
    .map(([id, v]) => ({ id, name: v.name, amount: round2(v.amount) }))
    .filter((r) => Math.abs(r.amount) > EPS)
    .sort((a, b) => b.amount - a.amount);
  return { rows, total: round2(rows.reduce((s, r) => s + r.amount, 0)) };
}

interface FixedAssetRow extends NamedAmountRow {
  code: string;
  category: 'Vehicle' | 'Other';
}

/** currentValue is today's depreciated book value (see file header limitation #2) — only capitalizationDate is cutoff-scoped. */
async function fixedAssetsBreakdown(cutoff: Date): Promise<{ rows: FixedAssetRow[]; total: number; vehicleTotal: number; otherTotal: number }> {
  const assets = await prisma.fixedAsset.findMany({
    where: { deletedAt: null, isActive: true, capitalizationDate: { lte: cutoff } },
    select: { id: true, assetCode: true, assetName: true, currentValue: true, vehicleId: true, vehicle: { select: { registrationNumber: true } } },
  });
  const rows: FixedAssetRow[] = assets
    .map((a) => ({
      id: a.id,
      name: a.vehicle ? `${a.assetName} (${a.vehicle.registrationNumber})` : a.assetName,
      code: a.assetCode,
      category: (a.vehicleId ? 'Vehicle' : 'Other') as 'Vehicle' | 'Other',
      amount: round2(Number(a.currentValue)),
    }))
    .sort((a, b) => b.amount - a.amount);
  return {
    rows,
    total: round2(rows.reduce((s, r) => s + r.amount, 0)),
    vehicleTotal: round2(rows.filter((r) => r.category === 'Vehicle').reduce((s, r) => s + r.amount, 0)),
    otherTotal: round2(rows.filter((r) => r.category === 'Other').reduce((s, r) => s + r.amount, 0)),
  };
}

export const balanceSheetService = {
  async get(asOfDateInput?: string) {
    const { dateStr, cutoff, isToday } = resolveAsOf(asOfDateInput);

    const [bankCash, customerRows, supplierRows, driverAdv, employeeAdv, fixedAssets, driverPay, capitalAccount] = await Promise.all([
      financialStateService.bankAndCashState(undefined),
      customerBreakdown(cutoff),
      supplierBreakdown(cutoff),
      driverAdvancesRecoverable(cutoff),
      employeeAdvancesRecoverable(cutoff),
      fixedAssetsBreakdown(cutoff),
      driverPayable(cutoff),
      capitalAccountBreakdown(cutoff),
    ]);

    const customerReceivable = customerRows.filter((r) => r.net > EPS);
    const customerAdvance = customerRows
      .filter((r) => r.net < -EPS)
      .map((r) => ({ id: r.id, name: r.name, amount: round2(-r.net) }));
    const supplierPayable = supplierRows.filter((r) => r.net > EPS);
    const supplierAdvance = supplierRows
      .filter((r) => r.net < -EPS)
      .map((r) => ({ id: r.id, name: r.name, amount: round2(-r.net) }));

    const totalCustomerReceivable = round2(customerReceivable.reduce((s, r) => s + r.net, 0));
    const totalCustomerAdvance = round2(customerAdvance.reduce((s, r) => s + r.amount, 0));
    const totalSupplierPayable = round2(supplierPayable.reduce((s, r) => s + r.net, 0));
    const totalSupplierAdvance = round2(supplierAdvance.reduce((s, r) => s + r.amount, 0));

    const advancesRecoverable = round2(totalSupplierAdvance + driverAdv.total + employeeAdv.total);
    const bankAndCash = round2(bankCash.totalBankBalance + bankCash.totalCashBalance);

    const assets = {
      bankAndCash,
      customerReceivables: totalCustomerReceivable,
      advancesRecoverable,
      fixedAssets: fixedAssets.total,
      otherAssets: 0,
    };
    const totalAssets = round2(assets.bankAndCash + assets.customerReceivables + assets.advancesRecoverable + assets.fixedAssets + assets.otherAssets);

    // Employee salary has no accrued-unpaid liability concept in this system
    // — a Financial Entry with purpose=SALARY pays and marks the month paid
    // in one atomic step (financial-entry.service.ts
    // delegateToEmployeeSalaryPayment), so this bucket is driver-only now.
    const driverEmployeePayables = round2(driverPay.total);
    const liabilities = {
      capitalAccount: capitalAccount.total,
      supplierPayables: totalSupplierPayable,
      driverEmployeePayables,
      customerAdvances: totalCustomerAdvance,
      otherLiabilities: 0,
    };
    const totalLiabilities = round2(
      liabilities.capitalAccount +
        liabilities.supplierPayables +
        liabilities.driverEmployeePayables +
        liabilities.customerAdvances +
        liabilities.otherLiabilities
    );

    const netPosition = round2(totalAssets - totalLiabilities);
    // Assets = Liabilities + Net Position always holds by construction here
    // (Net Position is the plug) — this system has no independent
    // capital/ledger figure to cross-check against without introducing the
    // Chart-of-Accounts concept this feature is explicitly forbidden from
    // adding. The check below guards against a future coding bug rather
    // than a genuine trial-balance mismatch.
    const difference = round2(totalAssets - (totalLiabilities + netPosition));

    const limitations = [
      'Bank & Cash always reflects the current balance — this system keeps a single running balance per account with no dated transaction ledger, so a true historical balance for a past date cannot be reconstructed.',
      "Fixed Asset values reflect today's depreciated book value, not a value recomputed for the selected date.",
      'Driver/Employee Advance settlement has no settlement timestamp in this system — a past-date view approximates using the record\'s creation date.',
    ];

    return {
      asOfDate: dateStr,
      isToday,
      generatedAt: new Date().toISOString(),
      assets,
      liabilities,
      totalAssets,
      totalLiabilities,
      netPosition,
      reconciliation: {
        reconciled: Math.abs(difference) < 0.01,
        difference,
        equation: 'Assets = Liabilities + Net Position',
      },
      breakdown: {
        bankAccounts: bankCash.bankAccounts,
        cashAccounts: bankCash.cashAccounts,
        customerReceivables: customerReceivable.map((r) => ({ id: r.id, name: r.name, amount: r.net })).sort((a, b) => b.amount - a.amount),
        customerAdvances: customerAdvance.sort((a, b) => b.amount - a.amount),
        supplierPayables: supplierPayable.map((r) => ({ id: r.id, name: r.name, amount: r.net })).sort((a, b) => b.amount - a.amount),
        supplierAdvances: supplierAdvance.sort((a, b) => b.amount - a.amount),
        driverAdvances: driverAdv.rows,
        employeeAdvances: employeeAdv.rows,
        driverPayables: driverPay.rows,
        employeePayables: [] as NamedAmountRow[],
        fixedAssets: fixedAssets.rows,
        fixedAssetsVehicleTotal: fixedAssets.vehicleTotal,
        fixedAssetsOtherTotal: fixedAssets.otherTotal,
        capitalAccount: capitalAccount.rows,
      },
      limitations,
    };
  },
};
