import { Request } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { financialEntryRepository, FinancialEntryWithRelations } from '../repositories/financial-entry.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { organizationService } from './organization.service';
import { receiptService } from './receipt.service';
import { supplierPaymentService } from './supplier-payment.service';
import { driverAdvanceService } from './driver-advance.service';
import { employeeAdvanceService } from './employee-advance.service';
import { bankTransferService } from './bank-transfer.service';
import { fuelEntryService } from './fuel-entry.service';
import { fastTagService } from './fasttag.service';
import { planCustomerSettlement, planSupplierSettlement, SettlementPlanItem } from '../utils/fifoSettlement.util';
import { resolveEntityLabel, FinancialPartyType } from '../utils/financialLedger.util';
import { resolveFundAccount, adjustFundAccountBalance } from '../utils/fundAccount.util';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateFinancialEntryInput } from '../validators/financial-entry.validator';

// Which existing specialized flow (if any) already maintains the
// receivable/payable/advance bookkeeping for this exact source/destination
// shape — delegating to it keeps AR/AP outstanding, aging and advance
// tracking correct without a second parallel implementation. Everything
// NOT listed here falls through to postGenericFundMovement(), which just
// directly adjusts whichever side (if either) is a real Bank/Cash account —
// there is no ledger to post to for any other party type in this model.
type DelegateResult = { sourceDocumentType: string; sourceDocumentId: string };
type Delegate = (input: CreateFinancialEntryInput, organizationId: string, actorId: string) => Promise<DelegateResult>;

interface ExecutedSettlementItem extends SettlementPlanItem {
  sourceDocumentType: string;
  sourceDocumentId: string;
}

const DRIVER_ADVANCE_TYPE_BY_PURPOSE: Record<string, string> = {
  TRIP_ADVANCE: 'TRIP_ADVANCE',
  SALARY: 'SALARY_ADVANCE',
  FUEL: 'FUEL_ADVANCE',
  REPAIR: 'REPAIR_ADVANCE',
};

const EMPLOYEE_ADVANCE_TYPE_BY_PURPOSE: Record<string, string> = {
  SALARY: 'SALARY_ADVANCE',
};

// Splitting one lump sum across N Receipts/SupplierPayments would collide
// on receipt/supplier-payment's own "reference number already used"
// uniqueness check if we passed the same referenceNumber to every split —
// suffix it per line the same way a paper receipt book would (Ref-1, Ref-2...).
function referenceForSplit(referenceNumber: string | undefined, index: number, total: number): string | undefined {
  if (!referenceNumber) return undefined;
  return total > 1 ? `${referenceNumber}-${index + 1}` : referenceNumber;
}

const isFundType = (t: string) => t === 'BANK' || t === 'CASH';

/**
 * Money Received from a Customer with no invoice pre-selected (Financial
 * Entry never exposes that picker) — apply it FIFO across the customer's
 * oldest outstanding Invoices first, each filled in full before moving to
 * the next ("fill before"), and whatever's left over posts as a plain
 * advance Receipt. Every split is a REAL Receipt through receiptService,
 * so Invoice.recalcInvoice fires exactly as it would if a human had
 * allocated each one by hand.
 */
async function settleCustomerFIFO(input: CreateFinancialEntryInput, actorId: string): Promise<ExecutedSettlementItem[]> {
  const plan = await planCustomerSettlement(input.sourceId!, input.amount);
  const executed: ExecutedSettlementItem[] = [];
  for (let i = 0; i < plan.length; i++) {
    const item = plan[i];
    const receipt = await receiptService.create(
      {
        companyId: input.sourceId!,
        invoiceId: item.targetType === 'INVOICE' ? item.targetId! : undefined,
        amount: item.amount,
        receiptDate: input.entryDate,
        paymentModeId: input.paymentModeId,
        referenceNumber: referenceForSplit(input.referenceNumber, i, plan.length),
        remarks: input.remarks,
        fundAccountType: input.destinationType as 'BANK' | 'CASH',
        fundAccountId: input.destinationId,
      },
      actorId
    );
    executed.push({ ...item, sourceDocumentType: 'Receipt', sourceDocumentId: receipt.id });
  }
  return executed;
}

/** Same FIFO idea for a Supplier: SupplierBills first, then unpaid completed Trips, oldest first, leftover as an advance SupplierPayment. */
async function settleSupplierFIFO(input: CreateFinancialEntryInput, actorId: string): Promise<ExecutedSettlementItem[]> {
  const plan = await planSupplierSettlement(input.destinationId!, input.amount);
  const executed: ExecutedSettlementItem[] = [];
  for (let i = 0; i < plan.length; i++) {
    const item = plan[i];
    const payment = await supplierPaymentService.create(
      {
        supplierId: input.destinationId!,
        tripId: item.targetType === 'TRIP' ? item.targetId! : undefined,
        billId: item.targetType === 'BILL' ? item.targetId! : undefined,
        amount: item.amount,
        paymentDate: input.entryDate,
        paymentModeId: input.paymentModeId,
        referenceNumber: referenceForSplit(input.referenceNumber, i, plan.length),
        remarks: input.remarks,
        fundAccountType: input.sourceType as 'BANK' | 'CASH',
        fundAccountId: input.sourceId,
      },
      actorId
    );
    executed.push({ ...item, sourceDocumentType: 'SupplierPayment', sourceDocumentId: payment.id });
  }
  return executed;
}

/**
 * "Recover unsettled advances first" — bounded by the amount just paid,
 * oldest advance first, each only marked settled if it can be covered in
 * full (mirrors the Bill/Trip "fill before" rule). This is a bookkeeping
 * status pass only — the new payment still posts for its own full amount,
 * exactly as a real cash handover must.
 */
async function recoverOldDriverAdvances(driverId: string, amountCap: number, actorId: string) {
  const unsettled = await prisma.driverAdvance.findMany({
    where: { driverId, approvalStatus: 'APPROVED', isSettled: false, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true, amount: true, advanceNumber: true },
  });
  const recovered: { id: string; amount: number; advanceNumber: string }[] = [];
  let remaining = amountCap;
  for (const adv of unsettled) {
    const amt = Number(adv.amount);
    if (amt > remaining + 0.001) break;
    recovered.push({ id: adv.id, amount: amt, advanceNumber: adv.advanceNumber });
    remaining = Number((remaining - amt).toFixed(2));
  }
  if (recovered.length > 0) {
    await prisma.driverAdvance.updateMany({ where: { id: { in: recovered.map((r) => r.id) } }, data: { isSettled: true, updatedById: actorId } });
  }
  return recovered;
}

async function recoverOldEmployeeAdvances(employeeId: string, amountCap: number, actorId: string) {
  const unsettled = await prisma.employeeAdvance.findMany({
    where: { employeeId, approvalStatus: 'APPROVED', isSettled: false, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true, amount: true, advanceNumber: true },
  });
  const recovered: { id: string; amount: number; advanceNumber: string }[] = [];
  let remaining = amountCap;
  for (const adv of unsettled) {
    const amt = Number(adv.amount);
    if (amt > remaining + 0.001) break;
    recovered.push({ id: adv.id, amount: amt, advanceNumber: adv.advanceNumber });
    remaining = Number((remaining - amt).toFixed(2));
  }
  if (recovered.length > 0) {
    await prisma.employeeAdvance.updateMany({ where: { id: { in: recovered.map((r) => r.id) } }, data: { isSettled: true, updatedById: actorId } });
  }
  return recovered;
}

/**
 * Undoes a settlement split's real record — Receipt/SupplierPayment.remove()
 * both soft-delete the row, reverse its fund-account balance AND re-trigger
 * Invoice/SupplierBill recalculation, so the outstanding amount that just
 * got reduced by this split correctly goes back up.
 */
async function retireSourceDocument(sourceDocumentType: string, sourceDocumentId: string, actorId: string) {
  if (sourceDocumentType === 'Receipt') {
    await receiptService.remove(sourceDocumentId, actorId);
  } else if (sourceDocumentType === 'SupplierPayment') {
    await supplierPaymentService.remove(sourceDocumentId, actorId);
  }
}

/**
 * Retires the record a delegate created, WITHOUT touching balances — the
 * caller has already replayed the cash effect via reverseGenericBalanceEffect,
 * so going through each document's own service would undo the money twice.
 *
 * Only Receipt and SupplierPayment (the FIFO settlement path) used to be
 * retired at all. Everything a delegate produced simply survived: cancelling a
 * salary payment returned the money but left the EmployeeSalaryPayment row, so
 * the employee stayed marked paid for that month and could never be paid for
 * it again; a cancelled advance stayed APPROVED and kept showing as
 * recoverable on the Balance Sheet.
 */
async function retireDelegateDocument(sourceDocumentType: string, sourceDocumentId: string, actorId: string) {
  switch (sourceDocumentType) {
    case 'EmployeeSalaryPayment': {
      const payment = await prisma.employeeSalaryPayment.findUnique({ where: { id: sourceDocumentId } });
      if (!payment) return;
      await prisma.employeeSalaryPayment.delete({ where: { id: sourceDocumentId } });
      // Re-open the advances this payment auto-settled. The forward path
      // settles every approved, unsettled advance raised in the salary month,
      // so the inverse reopens that same month-scoped set. Only one salary
      // payment can exist per employee per month (unique constraint), so no
      // other payment's settlements can be caught here.
      const { monthStart, monthEnd } = salaryMonthBounds(payment.year, payment.month);
      await prisma.employeeAdvance.updateMany({
        where: { employeeId: payment.employeeId, approvalStatus: 'APPROVED', isSettled: true, deletedAt: null, createdAt: { gte: monthStart, lte: monthEnd } },
        data: { isSettled: false, updatedById: actorId },
      });
      return;
    }
    case 'DriverSalaryPayment': {
      const payment = await prisma.driverSalaryPayment.findUnique({ where: { id: sourceDocumentId } });
      if (!payment) return;
      await prisma.driverSalaryPayment.delete({ where: { id: sourceDocumentId } });
      const { monthStart, monthEnd } = salaryMonthBounds(payment.year, payment.month);
      await prisma.driverAdvance.updateMany({
        where: { driverId: payment.driverId, approvalStatus: 'APPROVED', isSettled: true, deletedAt: null, createdAt: { gte: monthStart, lte: monthEnd } },
        data: { isSettled: false, updatedById: actorId },
      });
      return;
    }
    case 'EmployeeAdvance':
      await prisma.employeeAdvance.updateMany({
        where: { id: sourceDocumentId, deletedAt: null },
        data: { deletedAt: new Date(), updatedById: actorId },
      });
      return;
    case 'DriverAdvance':
      await prisma.driverAdvance.updateMany({
        where: { id: sourceDocumentId, deletedAt: null },
        data: { deletedAt: new Date(), updatedById: actorId },
      });
      return;
    case 'BankTransfer':
      await prisma.bankTransfer.updateMany({
        where: { id: sourceDocumentId, deletedAt: null },
        data: { deletedAt: new Date(), updatedById: actorId },
      });
      return;
    default:
      return;
  }
}

function salaryMonthBounds(year: number, month: number) {
  return {
    monthStart: new Date(Date.UTC(year, month - 1, 1)),
    monthEnd: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
  };
}

/**
 * Every non-FIFO entry's actual cash effect is always "destination gets the
 * money if it's a fund account, source loses it if it's a fund account" —
 * true whether it went through postGenericFundMovement directly or one of
 * the delegates below (they all follow the same debit-destination/
 * credit-source convention against the same source/destination fields
 * stored on the entry). So undoing it never needs to know which path was
 * taken — it just replays that rule in reverse.
 */
async function reverseGenericBalanceEffect(entry: {
  sourceType: string;
  sourceId: string | null;
  destinationType: string;
  destinationId: string | null;
  amount: Prisma.Decimal | number;
}) {
  const amount = Number(entry.amount);
  if (isFundType(entry.destinationType) && entry.destinationId) {
    await adjustFundAccountBalance(entry.destinationType as 'BANK' | 'CASH', entry.destinationId, -amount);
  }
  if (isFundType(entry.sourceType) && entry.sourceId) {
    await adjustFundAccountBalance(entry.sourceType as 'BANK' | 'CASH', entry.sourceId, amount);
  }
}

async function delegateToBankTransfer(input: CreateFinancialEntryInput, organizationId: string, actorId: string): Promise<DelegateResult> {
  const transfer = await bankTransferService.create(
    {
      organizationId,
      transferDate: input.entryDate,
      fromAccountType: input.sourceType as 'BANK' | 'CASH',
      fromAccountId: input.sourceId!,
      toAccountType: input.destinationType as 'BANK' | 'CASH',
      toAccountId: input.destinationId!,
      amount: input.amount,
      paymentModeId: input.paymentModeId,
      referenceNumber: input.referenceNumber,
      narration: input.remarks,
    },
    actorId
  );
  if (!transfer) throw new AppError('Bank Transfer creation did not return a record', 500);
  return { sourceDocumentType: 'BankTransfer', sourceDocumentId: transfer.id };
}

async function delegateToDriverAdvance(input: CreateFinancialEntryInput, _organizationId: string, actorId: string): Promise<DelegateResult> {
  const created = await driverAdvanceService.request(
    {
      driverId: input.destinationId!,
      tripId: input.tripId,
      vehicleId: input.vehicleId,
      advanceType: (DRIVER_ADVANCE_TYPE_BY_PURPOSE[input.purpose] ?? 'OTHER') as never,
      purpose: input.purposeNotes,
      amount: input.amount,
      paymentModeId: input.paymentModeId,
      fundAccountType: input.sourceType as 'BANK' | 'CASH',
      fundAccountId: input.sourceId,
    },
    actorId
  );
  const approved = await driverAdvanceService.approve(created.id, actorId);
  return { sourceDocumentType: 'DriverAdvance', sourceDocumentId: approved.id };
}

// Which calendar month a salary payment covers — input.salaryPeriod
// ("YYYY-MM", set by the Financial Entry "Salary Entry" toggle) when
// present, otherwise entryDate's own month (the plain generic-form path).
// Also returns the UTC month's [start, end] bounds, used to scope which
// advances count as "this month's" for the auto-settle step below.
function resolveSalaryPeriod(input: CreateFinancialEntryInput) {
  let year: number;
  let month: number;
  if (input.salaryPeriod) {
    const [y, m] = input.salaryPeriod.split('-').map(Number);
    year = y;
    month = m;
  } else {
    const entryDate = new Date(`${input.entryDate}T00:00:00.000Z`);
    year = entryDate.getUTCFullYear();
    month = entryDate.getUTCMonth() + 1;
  }
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { year, month, monthStart, monthEnd };
}

/**
 * Marks the employee's salary period (input.salaryPeriod, or entryDate's
 * own month) paid — the simple replacement for the old multi-step
 * PayrollRun engine. One row per employee per month (employeeId_year_month
 * unique constraint blocks a duplicate payment); the amount is exactly
 * whatever was typed into this entry, no Salary Structure recomputation.
 * Also settles (isSettled=true) whichever of the employee's unsettled
 * advances were raised within that same month — the "Salary Entry" toggle
 * on Financial Entry shows the caller a suggested net-of-advances amount
 * computed the same way (salary-payment-quote.service.ts), so this mirrors
 * that same month-scoped set rather than the generic oldest-first sweep
 * recoverOldEmployeeAdvances() does for every other Employee-destination
 * entry (skipped for this delegate — see create()'s skipGenericRecovery).
 */
async function delegateToEmployeeSalaryPayment(input: CreateFinancialEntryInput, organizationId: string, actorId: string): Promise<DelegateResult> {
  const { year, month, monthStart, monthEnd } = resolveSalaryPeriod(input);

  const existing = await prisma.employeeSalaryPayment.findUnique({
    where: { employeeId_year_month: { employeeId: input.destinationId!, year, month } },
  });
  if (existing) {
    throw new AppError(`Salary for this employee has already been marked paid for ${month}/${year}`, 409);
  }

  if (!input.sourceId) throw new AppError('A Bank/Cash source account must be selected', 422);
  const src = await resolveFundAccount(organizationId, input.sourceType as 'BANK' | 'CASH', input.sourceId);
  if (!src.isActive) throw new AppError('The selected source account is inactive', 409);
  await adjustFundAccountBalance(src.type, src.id, -input.amount);

  const payment = await prisma.employeeSalaryPayment.create({
    data: {
      employeeId: input.destinationId!,
      year,
      month,
      amount: input.amount,
      paidDate: new Date(`${input.entryDate}T00:00:00.000Z`),
      createdById: actorId,
    },
  });

  const monthAdvances = await prisma.employeeAdvance.findMany({
    where: { employeeId: input.destinationId!, approvalStatus: 'APPROVED', isSettled: false, deletedAt: null, createdAt: { gte: monthStart, lte: monthEnd } },
    select: { id: true },
  });
  if (monthAdvances.length > 0) {
    await prisma.employeeAdvance.updateMany({ where: { id: { in: monthAdvances.map((a) => a.id) } }, data: { isSettled: true, updatedById: actorId } });
  }

  return { sourceDocumentType: 'EmployeeSalaryPayment', sourceDocumentId: payment.id };
}

/** Driver equivalent of delegateToEmployeeSalaryPayment — same month-scoped paid-flag and advance auto-settle, against DriverSalaryPayment/DriverAdvance instead. */
async function delegateToDriverSalaryPayment(input: CreateFinancialEntryInput, organizationId: string, actorId: string): Promise<DelegateResult> {
  const { year, month, monthStart, monthEnd } = resolveSalaryPeriod(input);

  const existing = await prisma.driverSalaryPayment.findUnique({
    where: { driverId_year_month: { driverId: input.destinationId!, year, month } },
  });
  if (existing) {
    throw new AppError(`Salary for this driver has already been marked paid for ${month}/${year}`, 409);
  }

  if (!input.sourceId) throw new AppError('A Bank/Cash source account must be selected', 422);
  const src = await resolveFundAccount(organizationId, input.sourceType as 'BANK' | 'CASH', input.sourceId);
  if (!src.isActive) throw new AppError('The selected source account is inactive', 409);
  await adjustFundAccountBalance(src.type, src.id, -input.amount);

  const payment = await prisma.driverSalaryPayment.create({
    data: {
      driverId: input.destinationId!,
      year,
      month,
      amount: input.amount,
      paidDate: new Date(`${input.entryDate}T00:00:00.000Z`),
      createdById: actorId,
    },
  });

  const monthAdvances = await prisma.driverAdvance.findMany({
    where: { driverId: input.destinationId!, approvalStatus: 'APPROVED', isSettled: false, deletedAt: null, createdAt: { gte: monthStart, lte: monthEnd } },
    select: { id: true },
  });
  if (monthAdvances.length > 0) {
    await prisma.driverAdvance.updateMany({ where: { id: { in: monthAdvances.map((a) => a.id) } }, data: { isSettled: true, updatedById: actorId } });
  }

  return { sourceDocumentType: 'DriverSalaryPayment', sourceDocumentId: payment.id };
}

async function delegateToEmployeeAdvance(input: CreateFinancialEntryInput, _organizationId: string, actorId: string): Promise<DelegateResult> {
  const created = await employeeAdvanceService.request(
    {
      employeeId: input.destinationId!,
      advanceType: (EMPLOYEE_ADVANCE_TYPE_BY_PURPOSE[input.purpose] ?? 'OTHER') as never,
      purpose: input.purposeNotes,
      amount: input.amount,
      paymentModeId: input.paymentModeId,
      fundAccountType: input.sourceType as 'BANK' | 'CASH',
      fundAccountId: input.sourceId,
    },
    actorId
  );
  const approved = await employeeAdvanceService.approve(created.id, actorId);
  return { sourceDocumentType: 'EmployeeAdvance', sourceDocumentId: approved.id };
}

// Driver/Employee have no "bill" of their own — DriverAdvance/EmployeeAdvance
// is the one mechanism this codebase has for "give this person money," so
// any money-out entry type aimed at them (not just Advance Given) routes
// through it.
const DRIVER_EMPLOYEE_ENTRY_TYPES = new Set(['ADVANCE_GIVEN', 'MONEY_PAID', 'SALARY_SETTLEMENT']);

// A money-out entry to a Driver/Employee marked purpose=SALARY is a real
// salary payment, not an advance — except ADVANCE_GIVEN, which always means
// "give an advance" regardless of purpose (purpose there only picks the
// DriverAdvance/EmployeeAdvance's advanceType, see
// DRIVER_ADVANCE_TYPE_BY_PURPOSE/EMPLOYEE_ADVANCE_TYPE_BY_PURPOSE).
function resolveDelegate(input: CreateFinancialEntryInput): Delegate | null {
  if (input.entryType === 'MONEY_TRANSFER' && isFundType(input.sourceType) && isFundType(input.destinationType)) return delegateToBankTransfer;
  if (input.entryType !== 'ADVANCE_GIVEN' && input.purpose === 'SALARY' && isFundType(input.sourceType)) {
    if (input.destinationType === 'EMPLOYEE') return delegateToEmployeeSalaryPayment;
    if (input.destinationType === 'DRIVER') return delegateToDriverSalaryPayment;
  }
  if (DRIVER_EMPLOYEE_ENTRY_TYPES.has(input.entryType) && input.destinationType === 'DRIVER' && isFundType(input.sourceType)) return delegateToDriverAdvance;
  if (DRIVER_EMPLOYEE_ENTRY_TYPES.has(input.entryType) && input.destinationType === 'EMPLOYEE' && isFundType(input.sourceType)) return delegateToEmployeeAdvance;
  return null;
}

/** The fallback for every entry type/party pair with no specialized flow — directly moves money on whichever side (if either) is a real Bank/Cash account. Non-fund parties (Vehicle/Trip/Expense/Other/Loan Provider) carry no stored balance, so they contribute nothing but their label on the entry itself. */
async function postGenericFundMovement(organizationId: string, input: CreateFinancialEntryInput, actorId: string): Promise<void> {
  void actorId;
  if (isFundType(input.destinationType)) {
    if (!input.destinationId) throw new AppError('A Bank/Cash destination account must be selected', 422);
    const dest = await resolveFundAccount(organizationId, input.destinationType as 'BANK' | 'CASH', input.destinationId);
    if (!dest.isActive) throw new AppError('The selected destination account is inactive', 409);
    await adjustFundAccountBalance(dest.type, dest.id, input.amount);
  }
  if (isFundType(input.sourceType)) {
    if (!input.sourceId) throw new AppError('A Bank/Cash source account must be selected', 422);
    const src = await resolveFundAccount(organizationId, input.sourceType as 'BANK' | 'CASH', input.sourceId);
    if (!src.isActive) throw new AppError('The selected source account is inactive', 409);
    await adjustFundAccountBalance(src.type, src.id, -input.amount);
  }
}

/**
 * "Diesel and FastTag" linkage — additive only, never a second money
 * movement. FuelEntry.create() and FastTagAccount usage logging don't post
 * their own balance change of their own; the Fuel/Toll expense already got
 * its fund-account effect from this entry's own postGenericFundMovement
 * above), so calling them here just keeps the Fleet module's own screens
 * showing the same fill-up/toll-swipe. Silently skipped (not an error)
 * when the optional Fleet fields weren't filled in.
 */
async function maybeLinkFleetRecords(input: CreateFinancialEntryInput, actorId: string): Promise<{ fuelEntryId?: string; fastTagTransactionId?: string }> {
  if (input.purpose === 'FUEL' && input.vehicleId && input.quantityLiters && input.ratePerLiter && input.odometerReading) {
    const fuelEntry = await fuelEntryService.create(
      {
        vehicleId: input.vehicleId,
        tripId: input.tripId,
        quantityLiters: input.quantityLiters,
        ratePerLiter: input.ratePerLiter,
        odometerReading: input.odometerReading,
        entryDate: input.entryDate,
      },
      actorId
    );
    return { fuelEntryId: fuelEntry.id };
  }

  if (input.purpose === 'TOLL' && input.vehicleId) {
    await fastTagService.logUsage({ vehicleId: input.vehicleId, amount: input.amount, tripId: input.tripId, transactionDate: input.entryDate }, actorId);
    const txn = await prisma.fastTagTransaction.findFirst({ where: { vehicleId: input.vehicleId }, orderBy: { createdAt: 'desc' } });
    if (txn) return { fastTagTransactionId: txn.id };
  }

  return {};
}

function serialize(entry: FinancialEntryWithRelations) {
  return {
    id: entry.id,
    entryNumber: entry.entryNumber,
    entryType: entry.entryType,
    entryDate: entry.entryDate,
    source: { type: entry.sourceType, id: entry.sourceId, label: entry.sourceLabel },
    destination: { type: entry.destinationType, id: entry.destinationId, label: entry.destinationLabel },
    amount: entry.amount,
    paymentMode: entry.paymentMode,
    referenceNumber: entry.referenceNumber,
    remarks: entry.remarks,
    purpose: entry.purpose,
    purposeNotes: entry.purposeNotes,
    status: entry.status,
    // How the lump sum actually got applied — populated only for
    // Customer/Supplier entries that were auto-split FIFO across their
    // outstanding Invoices/Bills/Trips (see settleCustomerFIFO/
    // settleSupplierFIFO). Empty for every other entry type.
    appliedTo: (entry.settlementPlan as unknown as ExecutedSettlementItem[] | null) ?? [],
    sourceDocument: entry.sourceDocumentType ? { type: entry.sourceDocumentType, id: entry.sourceDocumentId } : null,
    fleet: {
      vehicleId: entry.vehicleId,
      tripId: entry.tripId,
      quantityLiters: entry.quantityLiters,
      ratePerLiter: entry.ratePerLiter,
      odometerReading: entry.odometerReading,
      fuelEntryId: entry.fuelEntryId,
      fastTagTransactionId: entry.fastTagTransactionId,
    },
    correctionOf: entry.correctionOf ? { id: entry.correctionOf.id, entryNumber: entry.correctionOf.entryNumber } : null,
    correctedBy: entry.correctedBy ? { id: entry.correctedBy.id, entryNumber: entry.correctedBy.entryNumber } : null,
    reversalOf: entry.reversalOf ? { id: entry.reversalOf.id, entryNumber: entry.reversalOf.entryNumber } : null,
    reversedBy: entry.reversedBy ? { id: entry.reversedBy.id, entryNumber: entry.reversedBy.entryNumber } : null,
    cancellationReason: entry.cancellationReason,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

export const financialEntryService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const { rows, total } = await financialEntryRepository.findManyPaginated({
      organizationId,
      skip,
      take,
      search: (query.search as string) || undefined,
      entryType: (query.entryType as string) || undefined,
      status: (query.status as string) || undefined,
      sourceType: (query.sourceType as string) || undefined,
      sourceId: (query.sourceId as string) || undefined,
      destinationType: (query.destinationType as string) || undefined,
      destinationId: (query.destinationId as string) || undefined,
      dateFrom: query.dateFrom ? new Date(query.dateFrom as string) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo as string) : undefined,
    });
    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const entry = await financialEntryRepository.findById(id);
    if (!entry) throw new AppError('Financial Entry not found', 404);
    return serialize(entry);
  },

  /**
   * The one screen a non-accountant uses for every money movement.
   * Customer/Supplier money movements are auto-split FIFO across their
   * oldest outstanding items (settleCustomerFIFO/settleSupplierFIFO);
   * Driver/Employee payments recover old unsettled advances first
   * (recoverOld*Advances); everything else either delegates to an
   * existing specialized flow or moves fund-account balances directly
   * (postGenericFundMovement). Either way this row is created first
   * (DRAFT) so a mid-flight failure leaves a traceable, retryable/
   * cancellable record instead of nothing at all.
   */
  async create(input: CreateFinancialEntryInput, actorId: string) {
    const organizationId = await organizationService.resolveOrganizationId(input.organizationId);

    if (input.sourceType === input.destinationType && input.sourceId && input.sourceId === input.destinationId) {
      throw new AppError('Source and destination cannot be the same', 422);
    }
    if (input.entryType === 'MONEY_TRANSFER' && (!isFundType(input.sourceType) || !isFundType(input.destinationType))) {
      throw new AppError('A Money Transfer must move between Bank/Cash accounts on both sides', 422);
    }

    const sourceLabel = await resolveEntityLabel(input.sourceType as FinancialPartyType, input.sourceId, input.sourceLabel);
    const destinationLabel = await resolveEntityLabel(input.destinationType as FinancialPartyType, input.destinationId, input.destinationLabel);

    const entryNumber = await financialEntryRepository.nextEntryNumber();
    const entry = await financialEntryRepository.create({
      organizationId,
      entryNumber,
      entryType: input.entryType,
      entryDate: new Date(`${input.entryDate}T00:00:00.000Z`),
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      sourceLabel,
      destinationType: input.destinationType,
      destinationId: input.destinationId,
      destinationLabel,
      amount: input.amount,
      paymentModeId: input.paymentModeId,
      referenceNumber: input.referenceNumber,
      remarks: input.remarks,
      purpose: input.purpose,
      purposeNotes: input.purposeNotes,
      vehicleId: input.vehicleId,
      tripId: input.tripId,
      quantityLiters: input.quantityLiters,
      ratePerLiter: input.ratePerLiter,
      odometerReading: input.odometerReading,
      status: 'DRAFT',
      createdById: actorId,
      updatedById: actorId,
    });

    let sourceDocumentType: string | undefined;
    let sourceDocumentId: string | undefined;
    let settlementPlan: ExecutedSettlementItem[] | undefined;
    let fuelEntryId: string | undefined;
    let fastTagTransactionId: string | undefined;
    let recoveredNote = '';

    // The entry row above is written before any money moves, so that the
    // delegates below can reference a real entry number. If any of them
    // rejects — a duplicate salary month, an inactive account, an
    // insufficient cash balance — the caller sees the error but the DRAFT
    // row would otherwise survive as a phantom entry that never posted.
    // Retire it on the way out so a rejected call leaves nothing behind.
    try {
    if (input.entryType === 'MONEY_RECEIVED' && input.sourceType === 'CUSTOMER' && isFundType(input.destinationType)) {
      settlementPlan = await settleCustomerFIFO(input, actorId);
    } else if (input.entryType === 'MONEY_PAID' && input.destinationType === 'SUPPLIER' && isFundType(input.sourceType)) {
      settlementPlan = await settleSupplierFIFO(input, actorId);
    } else {
      const delegate = resolveDelegate(input);
      if (delegate) {
        const result = await delegate(input, organizationId, actorId);
        sourceDocumentType = result.sourceDocumentType;
        sourceDocumentId = result.sourceDocumentId;

        // Salary-payment delegates already settled exactly this month's
        // advances themselves (delegateToEmployee/DriverSalaryPayment) —
        // running the generic oldest-first sweep on top of that would
        // over-recover into other months using the same entry amount.
        const isSalaryPayment = sourceDocumentType === 'EmployeeSalaryPayment' || sourceDocumentType === 'DriverSalaryPayment';
        if (!isSalaryPayment && input.destinationType === 'DRIVER') {
          const recovered = await recoverOldDriverAdvances(input.destinationId!, input.amount, actorId);
          if (recovered.length > 0) recoveredNote = ` — recovered ${recovered.length} prior advance(s) totaling ₹${recovered.reduce((s, r) => s + r.amount, 0).toFixed(2)}`;
        } else if (!isSalaryPayment && input.destinationType === 'EMPLOYEE') {
          const recovered = await recoverOldEmployeeAdvances(input.destinationId!, input.amount, actorId);
          if (recovered.length > 0) recoveredNote = ` — recovered ${recovered.length} prior advance(s) totaling ₹${recovered.reduce((s, r) => s + r.amount, 0).toFixed(2)}`;
        }
      } else {
        await postGenericFundMovement(organizationId, input, actorId);

        const fleetLinks = await maybeLinkFleetRecords(input, actorId);
        fuelEntryId = fleetLinks.fuelEntryId;
        fastTagTransactionId = fleetLinks.fastTagTransactionId;
      }
    }

    await financialEntryRepository.update(entry.id, {
      status: 'COMPLETED',
      sourceDocumentType,
      sourceDocumentId,
      settlementPlan: settlementPlan as unknown as Prisma.InputJsonValue | undefined,
      fuelEntryId,
      fastTagTransactionId,
      updatedById: actorId,
    });
    } catch (err) {
      await financialEntryRepository.hardDelete(entry.id).catch(() => {
        // If even the cleanup fails the original error is still the useful
        // one — leave the DRAFT row rather than masking why the post failed.
      });
      throw err;
    }

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'FinancialEntry',
      entityId: entry.id,
      description: `Recorded ${entry.entryType} of ₹${input.amount} — ${sourceLabel} to ${destinationLabel} (${entryNumber})${recoveredNote}`,
    });

    return financialEntryService.getById(entry.id);
  },

  /** Cancels the entry — undoes its real fund-account effect (directly, or via the FIFO splits' own Receipt/SupplierPayment removal). */
  async cancel(id: string, reason: string, actorId: string) {
    const entry = await financialEntryRepository.findByIdBasic(id);
    if (!entry) throw new AppError('Financial Entry not found', 404);
    if (entry.status === 'CANCELLED') throw new AppError('Entry is already cancelled', 409);
    if (entry.status === 'REVERSED') throw new AppError('A reversed entry cannot be cancelled', 409);

    const plan = (entry.settlementPlan as unknown as ExecutedSettlementItem[] | null) ?? null;
    if (plan && plan.length > 0) {
      for (const item of plan) {
        await retireSourceDocument(item.sourceDocumentType, item.sourceDocumentId, actorId);
      }
    } else {
      await reverseGenericBalanceEffect(entry);
      // The cash is undone above; this retires the record the delegate
      // created so it stops counting (a salary month staying "paid", an
      // advance staying recoverable).
      if (entry.sourceDocumentType && entry.sourceDocumentId) {
        await retireDelegateDocument(entry.sourceDocumentType, entry.sourceDocumentId, actorId);
      }
    }

    await financialEntryRepository.update(id, {
      status: 'CANCELLED',
      cancelledById: actorId,
      cancelledAt: new Date(),
      cancellationReason: reason,
      updatedById: actorId,
    });

    await auditService.record({ userId: actorId, action: 'CANCEL', entityType: 'FinancialEntry', entityId: id, description: `Cancelled entry ${entry.entryNumber}: ${reason}` });
    return financialEntryService.getById(id);
  },

  /**
   * Creates a brand-new offsetting FinancialEntry (source/destination
   * swapped) — the original is preserved and marked REVERSED, never
   * edited in place. The real balance restoration happens once, up front
   * (same undo path as cancel()); the new entry is a documented mirror of
   * what was undone, not a second money movement.
   */
  async reverse(id: string, reason: string | undefined, actorId: string) {
    const entry = await financialEntryRepository.findByIdBasic(id);
    if (!entry) throw new AppError('Financial Entry not found', 404);
    if (entry.status === 'CANCELLED' || entry.status === 'REVERSED') throw new AppError(`Entry is ${entry.status} and cannot be reversed`, 409);

    // Claim the reversal's document number BEFORE touching any balance. When
    // this ran afterwards, a failure here (a clashing number, a dead
    // connection) left the money already restored while the original entry
    // stayed COMPLETED — so it could be reversed or cancelled a second time
    // and the amount was credited twice.
    const entryNumber = await financialEntryRepository.nextEntryNumber();

    const plan = (entry.settlementPlan as unknown as ExecutedSettlementItem[] | null) ?? null;
    if (plan && plan.length > 0) {
      for (const item of plan) {
        await retireSourceDocument(item.sourceDocumentType, item.sourceDocumentId, actorId);
      }
    } else {
      await reverseGenericBalanceEffect(entry);
      // The cash is undone above; this retires the record the delegate
      // created so it stops counting (a salary month staying "paid", an
      // advance staying recoverable).
      if (entry.sourceDocumentType && entry.sourceDocumentId) {
        await retireDelegateDocument(entry.sourceDocumentType, entry.sourceDocumentId, actorId);
      }
    }

    const reversalEntry = await financialEntryRepository.create({
      organizationId: entry.organizationId,
      entryNumber,
      entryType: entry.entryType,
      entryDate: new Date(),
      sourceType: entry.destinationType,
      sourceId: entry.destinationId,
      sourceLabel: entry.destinationLabel,
      destinationType: entry.sourceType,
      destinationId: entry.sourceId,
      destinationLabel: entry.sourceLabel,
      amount: entry.amount,
      paymentModeId: entry.paymentModeId,
      remarks: reason ? `Reversal of ${entry.entryNumber}: ${reason}` : `Reversal of ${entry.entryNumber}`,
      purpose: entry.purpose,
      status: 'COMPLETED',
      settlementPlan: entry.settlementPlan ?? undefined,
      reversalOfId: entry.id,
      createdById: actorId,
      updatedById: actorId,
    });

    await financialEntryRepository.update(id, { status: 'REVERSED', updatedById: actorId });

    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'FinancialEntry', entityId: id, description: `Reversed entry ${entry.entryNumber} via ${reversalEntry.entryNumber}` });
    return financialEntryService.getById(reversalEntry.id);
  },

  /**
   * Hard-removes an entry from the list. Only allowed once it has no live
   * balance effect — DRAFT (never finished posting) or already
   * CANCELLED/REVERSED (its money effect was already undone by cancel()/
   * reverse()). A COMPLETED/*_ALLOCATED entry must be Cancelled or Reversed
   * first, which reuses the one already-tested balance-undo path instead of
   * this method growing a second one.
   */
  async remove(id: string, actorId: string) {
    const entry = await financialEntryRepository.findByIdBasic(id);
    if (!entry) throw new AppError('Financial Entry not found', 404);
    if (!['DRAFT', 'CANCELLED', 'REVERSED'].includes(entry.status)) {
      throw new AppError('Only a Draft, Cancelled or Reversed entry can be deleted — cancel or reverse this entry first', 409);
    }

    await financialEntryRepository.softDelete(id, actorId);

    await auditService.record({ userId: actorId, action: 'DELETE', entityType: 'FinancialEntry', entityId: id, description: `Deleted entry ${entry.entryNumber}` });
  },

  /** Correction = reverse the original (preserving it in full) + create a fresh, corrected entry linked back via correctionOfId. */
  async correct(id: string, input: CreateFinancialEntryInput, actorId: string) {
    const original = await financialEntryRepository.findByIdBasic(id);
    if (!original) throw new AppError('Financial Entry not found', 404);

    if (original.status !== 'CANCELLED' && original.status !== 'REVERSED') {
      await financialEntryService.reverse(id, 'Superseded by correction', actorId);
    }

    const corrected = await financialEntryService.create(input, actorId);
    await financialEntryRepository.update(corrected.id, { correctionOfId: id, updatedById: actorId });

    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'FinancialEntry', entityId: id, description: `Corrected by new entry ${corrected.entryNumber}` });
    return financialEntryService.getById(corrected.id);
  },
};
