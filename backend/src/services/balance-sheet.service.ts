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

/**
 * Owner money, split into the two things it actually is (spec §9–§12):
 * CONTRIBUTION/WITHDRAWAL is EQUITY the owner permanently holds, while
 * OWNER_LOAN_* is a LIABILITY the business owes back. They are summed
 * separately here so no caller can accidentally add them together.
 *
 * contributed/withdrawn are also returned gross, because the Equity section
 * shows Owner Capital and Drawings as two lines, not one net figure.
 */
async function ownerFundsBreakdown(cutoff: Date): Promise<{
  capitalRows: NamedAmountRow[];
  contributed: number;
  withdrawn: number;
  capitalTotal: number;
  ownerLoanRows: NamedAmountRow[];
  ownerLoanTotal: number;
}> {
  const transactions = await prisma.capitalTransaction.findMany({
    where: { deletedAt: null, transactionDate: { lte: cutoff } },
    select: { partnerId: true, type: true, amount: true, partner: { select: { name: true } } },
  });

  const capitalNet = new Map<string, { name: string; amount: number }>();
  const loanNet = new Map<string, { name: string; amount: number }>();
  let contributed = 0;
  let withdrawn = 0;

  for (const t of transactions) {
    const amount = Number(t.amount);
    const isCapital = t.type === 'CONTRIBUTION' || t.type === 'WITHDRAWAL';
    const isInbound = t.type === 'CONTRIBUTION' || t.type === 'OWNER_LOAN_RECEIVED';
    const target = isCapital ? capitalNet : loanNet;
    const existing = target.get(t.partnerId);
    target.set(t.partnerId, { name: t.partner.name, amount: (existing?.amount ?? 0) + (isInbound ? amount : -amount) });

    if (t.type === 'CONTRIBUTION') contributed += amount;
    if (t.type === 'WITHDRAWAL') withdrawn += amount;
  }

  const toRows = (m: Map<string, { name: string; amount: number }>) =>
    Array.from(m.entries())
      .map(([id, v]) => ({ id, name: v.name, amount: round2(v.amount) }))
      .filter((r) => Math.abs(r.amount) > EPS)
      .sort((a, b) => b.amount - a.amount);

  const capitalRows = toRows(capitalNet);
  const ownerLoanRows = toRows(loanNet);

  return {
    capitalRows,
    contributed: round2(contributed),
    withdrawn: round2(withdrawn),
    capitalTotal: round2(capitalRows.reduce((s, r) => s + r.amount, 0)),
    ownerLoanRows,
    ownerLoanTotal: round2(ownerLoanRows.reduce((s, r) => s + r.amount, 0)),
  };
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

interface LoanRow extends NamedAmountRow {
  lenderName: string;
  loanType: string;
  linkedTo: string | null;
}

/**
 * Money the company BORROWED — outstanding principal as of cutoff, exact
 * because LoanInstallment.paidDate is a real timestamp. Covers every loan
 * type; the Owner Loan slice is what keeps owner money out of Equity
 * (spec §12).
 */
async function loansBreakdown(cutoff: Date): Promise<{ rows: LoanRow[]; total: number; byType: Record<string, number> }> {
  const loans = await prisma.loan.findMany({
    where: { deletedAt: null, status: { not: 'FORECLOSED' }, loanStartDate: { lte: cutoff } },
    include: {
      installments: true,
      vehicle: { select: { registrationNumber: true } },
      capitalPartner: { select: { name: true } },
    },
  });

  const rows: LoanRow[] = loans
    .map((loan) => {
      const paidPrincipal = loan.installments
        .filter((i) => i.status === 'PAID' && i.paidDate && i.paidDate <= cutoff)
        .reduce((s, i) => s + Number(i.principalComponent), 0);
      return {
        id: loan.id,
        name: `${loan.loanNumber} — ${loan.loanName}`,
        lenderName: loan.lenderName,
        loanType: loan.loanType,
        linkedTo: loan.vehicle?.registrationNumber ?? loan.capitalPartner?.name ?? null,
        amount: round2(Math.max(Number(loan.principalAmount) - paidPrincipal, 0)),
      };
    })
    .filter((r) => r.amount > EPS)
    .sort((a, b) => b.amount - a.amount);

  const byType: Record<string, number> = {};
  for (const r of rows) byType[r.loanType] = round2((byType[r.loanType] || 0) + r.amount);

  return { rows, total: round2(rows.reduce((s, r) => s + r.amount, 0)), byType };
}

export const balanceSheetService = {
  async get(asOfDateInput?: string) {
    const { dateStr, cutoff, isToday } = resolveAsOf(asOfDateInput);

    const [bankCash, customerRows, supplierRows, driverAdv, employeeAdv, fixedAssets, driverPay, ownerFunds, loans] = await Promise.all([
      financialStateService.bankAndCashState(undefined),
      customerBreakdown(cutoff),
      supplierBreakdown(cutoff),
      driverAdvancesRecoverable(cutoff),
      employeeAdvancesRecoverable(cutoff),
      fixedAssetsBreakdown(cutoff),
      driverPayable(cutoff),
      ownerFundsBreakdown(cutoff),
      loansBreakdown(cutoff),
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

    // ------------------------------------------------------------ ASSETS
    // Split Fixed vs Current the way the report is actually read (spec §19),
    // rather than as one flat list.
    const fixedAssetsGroup = {
      vehicles: fixedAssets.vehicleTotal,
      equipmentAndOther: fixedAssets.otherTotal,
      total: fixedAssets.total,
    };
    const currentAssetsGroup = {
      cash: round2(bankCash.totalCashBalance),
      bank: round2(bankCash.totalBankBalance),
      receivables: totalCustomerReceivable,
      advances: advancesRecoverable,
      total: round2(bankAndCash + totalCustomerReceivable + advancesRecoverable),
    };
    const assets = {
      fixedAssets: fixedAssetsGroup,
      currentAssets: currentAssetsGroup,
      otherAssets: 0,
    };
    const totalAssets = round2(fixedAssetsGroup.total + currentAssetsGroup.total + assets.otherAssets);

    // ------------------------------------------------------- LIABILITIES
    // Employee salary has no accrued-unpaid liability concept in this system
    // — a Financial Entry with purpose=SALARY pays and marks the month paid
    // in one atomic step (financial-entry.service.ts
    // delegateToEmployeeSalaryPayment), so this bucket is driver-only now.
    const driverEmployeePayables = round2(driverPay.total);

    // Owner loans arrive from two places and both are real, separate debts:
    // a formal Loan with an EMI schedule (Loans & EMI), and informal money
    // recorded on Capital & Owner Funds. Adding them is not double counting
    // — they are different rows — and the breakdown lists both.
    const ownerLoansTotal = round2((loans.byType.OWNER_LOAN || 0) + ownerFunds.ownerLoanTotal);

    const liabilities = {
      vehicleLoans: loans.byType.VEHICLE_LOAN || 0,
      bankLoans: round2((loans.byType.BANK_LOAN || 0) + (loans.byType.BUSINESS_LOAN || 0)),
      ownerLoans: ownerLoansTotal,
      otherLoans: loans.byType.OTHER_LOAN || 0,
      supplierPayables: totalSupplierPayable,
      employeePayables: driverEmployeePayables,
      customerAdvances: totalCustomerAdvance,
      // No statutory/tax accrual is tracked anywhere in this app — GST/TDS
      // filing was removed along with the ledger engine. Reported as 0
      // rather than omitted, so the section keeps the spec's shape.
      taxPayables: 0,
      otherLiabilities: 0,
    };
    const totalLiabilities = round2(
      liabilities.vehicleLoans +
        liabilities.bankLoans +
        liabilities.ownerLoans +
        liabilities.otherLoans +
        liabilities.supplierPayables +
        liabilities.employeePayables +
        liabilities.customerAdvances +
        liabilities.taxPayables +
        liabilities.otherLiabilities
    );

    // ------------------------------------------------------------ EQUITY
    // Owner Capital and Drawings come straight from CapitalTransaction — the
    // whole point of Phase 2 is that owner money lands here as equity only
    // when it genuinely is equity, with owner loans sitting in LIABILITIES
    // above instead.
    //
    // Retained Profit is the balancing figure: this app keeps no cumulative
    // retained-earnings record (P&L reports one period at a time), so it is
    // derived as whatever makes Assets = Liabilities + Equity hold. That is
    // stated in `limitations` rather than passed off as an independently
    // computed number.
    const ownerCapital = ownerFunds.contributed;
    const drawings = ownerFunds.withdrawn;
    const retainedProfit = round2(totalAssets - totalLiabilities - ownerCapital + drawings);

    const equity = { ownerCapital, retainedProfit, drawings };
    const totalEquity = round2(equity.ownerCapital + equity.retainedProfit - equity.drawings);

    // Holds by construction (Retained Profit is the plug); this guards
    // against a future coding bug, not a genuine trial-balance mismatch.
    const difference = round2(totalAssets - (totalLiabilities + totalEquity));

    const limitations = [
      'Bank & Cash always reflects the current balance — this system keeps a single running balance per account with no dated transaction ledger, so a true historical balance for a past date cannot be reconstructed.',
      "Fixed Asset values reflect today's depreciated book value, not a value recomputed for the selected date.",
      'Driver/Employee Advance settlement has no settlement timestamp in this system — a past-date view approximates using the record\'s creation date.',
      'Retained Profit is derived as Assets − Liabilities − Owner Capital + Drawings. This app keeps no cumulative retained-earnings figure (Profit & Loss reports one period at a time), so it balances the sheet by construction rather than being independently computed.',
      'Tax / Statutory Payables always reads 0 — no GST/TDS accrual is tracked in this system.',
    ];

    return {
      asOfDate: dateStr,
      isToday,
      generatedAt: new Date().toISOString(),
      assets,
      liabilities,
      equity,
      totalAssets,
      totalLiabilities,
      totalEquity,
      reconciliation: {
        reconciled: Math.abs(difference) < 0.01,
        difference,
        equation: 'Assets = Liabilities + Equity',
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
        loans: loans.rows,
        ownerLoans: ownerFunds.ownerLoanRows,
        capitalAccount: ownerFunds.capitalRows,
      },
      limitations,
    };
  },
};
