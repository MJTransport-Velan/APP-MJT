/**
 * Loans & EMI. One generic Loan covers Vehicle / Bank / Business / Owner /
 * Other — they differ only in which master they point at, never in their
 * EMI mechanics.
 *
 * Nothing here stores a balance. Outstanding principal is always
 * principalAmount − SUM(paid installments' principalComponent), computed
 * live, exactly like every other balance in this app.
 *
 * Creating a loan does NOT credit a bank account: for a vehicle loan the
 * lender pays the dealer directly, so the money never lands in our account.
 * Paying an EMI is the only operation that moves real money, and it does
 * all three things the user would otherwise have to enter by hand:
 *   Bank/Cash        − EMI
 *   Loan outstanding − principal component
 *   Interest expense + interest component
 * plus a FinancialEntry so the payment appears in Financial Entries
 * without being typed twice (spec §27).
 */
import { Request } from 'express';
import { prisma } from '../config/db';
import { loanRepository, LoanWithRelations } from '../repositories/loan.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { organizationService } from './organization.service';
import { resolveFundAccount, adjustFundAccountBalance } from '../utils/fundAccount.util';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { calculateEmi, generateLoanSchedule } from '../utils/loanSchedule.util';
import { nextDocumentNumber, highestSequenceToday } from '../utils/documentNumber.util';
import { CreateLoanInput, UpdateLoanInput, PayEmiInput } from '../validators/loan.validator';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const EPS = 0.01;

function toDateOnly(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

/** Derived money position for one loan — never stored, always recomputed. */
function loanTotals(loan: { principalAmount: unknown; installments: { status: string; principalComponent: unknown; interestComponent: unknown; paidAmount: unknown; dueDate: Date }[] }) {
  const paid = loan.installments.filter((i) => i.status === 'PAID');
  const principalPaid = round2(paid.reduce((s, i) => s + Number(i.principalComponent), 0));
  const interestPaid = round2(paid.reduce((s, i) => s + Number(i.interestComponent), 0));
  const totalPaid = round2(paid.reduce((s, i) => s + Number(i.paidAmount ?? 0), 0));
  const pending = loan.installments.filter((i) => i.status === 'PENDING' || i.status === 'OVERDUE');
  const overdue = loan.installments.filter((i) => i.status === 'OVERDUE');
  const next = pending.slice().sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];
  const lastDue = loan.installments.slice().sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime())[0];

  return {
    principalPaid,
    interestPaid,
    totalEmiPaid: totalPaid,
    outstandingPrincipal: round2(Math.max(Number(loan.principalAmount) - principalPaid, 0)),
    paidCount: paid.length,
    pendingCount: pending.length,
    overdueCount: overdue.length,
    remainingEmis: pending.length,
    nextEmiDate: next?.dueDate ?? null,
    loanClosingDate: lastDue?.dueDate ?? null,
  };
}

function serialize(loan: LoanWithRelations) {
  return {
    id: loan.id,
    loanNumber: loan.loanNumber,
    loanName: loan.loanName,
    lenderName: loan.lenderName,
    loanType: loan.loanType,
    vehicle: loan.vehicle ? { id: loan.vehicle.id, registrationNumber: loan.vehicle.registrationNumber } : null,
    fixedAsset: loan.fixedAsset ? { id: loan.fixedAsset.id, assetCode: loan.fixedAsset.assetCode, assetName: loan.fixedAsset.assetName } : null,
    capitalPartner: loan.capitalPartner ? { id: loan.capitalPartner.id, name: loan.capitalPartner.name } : null,
    loanStartDate: loan.loanStartDate,
    // For an OPENING loan this is what was still owed at migration; the
    // amount the lender originally sanctioned is originalPrincipal.
    principalAmount: Number(loan.principalAmount),
    origin: loan.origin,
    originalPrincipal: loan.originalPrincipal === null ? null : Number(loan.originalPrincipal),
    openingAsOfDate: loan.openingAsOfDate,
    migrationSource: loan.migrationSource,
    migrationStatus: loan.migrationStatus,
    interestRatePercent: Number(loan.interestRatePercent),
    tenureMonths: loan.tenureMonths,
    emiAmount: Number(loan.emiAmount),
    firstEmiDate: loan.firstEmiDate,
    fundAccountType: loan.fundAccountType,
    fundAccountId: loan.fundAccountId,
    loanAccountRef: loan.loanAccountRef,
    status: loan.status,
    remarks: loan.remarks,
    totals: loanTotals(loan),
    installments: loan.installments.map((i) => ({
      id: i.id,
      installmentNo: i.installmentNo,
      dueDate: i.dueDate,
      emiAmount: Number(i.emiAmount),
      principalComponent: Number(i.principalComponent),
      interestComponent: Number(i.interestComponent),
      status: i.status,
      paidDate: i.paidDate,
      paidAmount: i.paidAmount === null ? null : Number(i.paidAmount),
      referenceNumber: i.referenceNumber,
      remarks: i.remarks,
    })),
    createdAt: loan.createdAt,
    updatedAt: loan.updatedAt,
  };
}

/**
 * Writes the FinancialEntry mirroring an EMI payment directly, rather than
 * calling financialEntryService.create() — that path would adjust the fund
 * account a second time, double-debiting the payment.
 */
async function recordEmiFinancialEntry(params: {
  organizationId: string;
  loan: { id: string; loanNumber: string; loanName: string; lenderName: string };
  installmentId: string;
  installmentNo: number;
  amount: number;
  paidDate: Date;
  fundAccountType: 'BANK' | 'CASH';
  fundAccountId: string;
  fundAccountLabel: string;
  paymentModeId?: string;
  referenceNumber?: string;
  actorId: string;
}) {
  const entryNumber = await nextDocumentNumber('FE', 5, async (stamp) => {
    const rows = await prisma.financialEntry.findMany({
      where: { entryNumber: { startsWith: `FE-${stamp}-` } },
      select: { entryNumber: true },
    });
    return highestSequenceToday(rows, 'entryNumber', 'FE', stamp);
  });

  const entry = await prisma.financialEntry.create({
    data: {
      organizationId: params.organizationId,
      entryNumber,
      entryType: 'LOAN_REPAYMENT',
      entryDate: params.paidDate,
      sourceType: params.fundAccountType,
      sourceId: params.fundAccountId,
      sourceLabel: params.fundAccountLabel,
      destinationType: 'LOAN_PROVIDER',
      destinationId: params.loan.id,
      destinationLabel: `${params.loan.lenderName} — ${params.loan.loanName}`,
      amount: params.amount,
      paymentModeId: params.paymentModeId,
      referenceNumber: params.referenceNumber,
      purpose: 'LOAN_EMI',
      purposeNotes: `EMI ${params.installmentNo} for ${params.loan.loanNumber}`,
      status: 'COMPLETED',
      sourceDocumentType: 'LoanInstallment',
      sourceDocumentId: params.installmentId,
      createdById: params.actorId,
      updatedById: params.actorId,
    },
  });

  return entry.id;
}

export const loanService = {
  async list(query: Request['query']) {
    await loanRepository.markOverdue(new Date());
    const { page, pageSize, skip, take } = parsePagination(query);
    const { rows, total } = await loanRepository.findManyPaginated({
      skip,
      take,
      search: (query.search as string) || undefined,
      loanType: (query.loanType as string) || undefined,
      status: (query.status as string) || undefined,
      vehicleId: (query.vehicleId as string) || undefined,
      origin: (query.origin as string) || undefined,
    });
    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    await loanRepository.markOverdue(new Date());
    const loan = await loanRepository.findById(id);
    if (!loan) throw new AppError('Loan not found', 404);
    return serialize(loan);
  },

  async create(input: CreateLoanInput, actorId: string) {
    const organizationId = await organizationService.resolveOrganizationId(undefined);

    if (input.vehicleId) {
      const vehicle = await prisma.vehicle.findFirst({ where: { id: input.vehicleId, deletedAt: null } });
      if (!vehicle) throw new AppError('Vehicle not found', 404);
    }
    if (input.capitalPartnerId) {
      const partner = await prisma.capitalPartner.findFirst({ where: { id: input.capitalPartnerId, deletedAt: null } });
      if (!partner) throw new AppError('Owner / Partner not found', 404);
    }
    if (input.fixedAssetId) {
      const asset = await prisma.fixedAsset.findFirst({ where: { id: input.fixedAssetId, deletedAt: null } });
      if (!asset) throw new AppError('Fixed Asset not found', 404);
    }

    const fundAccount = await resolveFundAccount(organizationId, input.fundAccountType, input.fundAccountId);
    if (!fundAccount.isActive) throw new AppError('The selected payment account is inactive', 409);

    const interestRatePercent = input.interestRatePercent ?? 0;
    const emiAmount = input.emiAmount ?? calculateEmi(input.principalAmount, interestRatePercent, input.tenureMonths);

    // A too-small EMI never amortizes — the first interest charge would
    // exceed it and the balance would grow forever.
    const firstInterest = round2((input.principalAmount * interestRatePercent) / 12 / 100);
    if (emiAmount <= firstInterest) {
      throw new AppError(
        `An EMI of ${emiAmount} never repays this loan — the first month's interest alone is ${firstInterest}. Raise the EMI or lower the rate.`,
        422
      );
    }

    const firstEmiDate = toDateOnly(input.firstEmiDate);
    // For an OPENING loan the schedule is generated from what is STILL owed
    // over the EMIs that are LEFT — the old system's paid EMIs are history
    // and are never recreated here (§10).
    const schedule = generateLoanSchedule(input.principalAmount, interestRatePercent, input.tenureMonths, emiAmount, firstEmiDate);
    const loanNumber = await loanRepository.nextLoanNumber();
    const isOpening = input.origin === 'OPENING';
    if (isOpening && input.originalPrincipal !== undefined && input.originalPrincipal < input.principalAmount) {
      throw new AppError(
        `The outstanding amount (${input.principalAmount}) cannot be more than the original loan amount (${input.originalPrincipal}).`,
        422
      );
    }

    const loan = await loanRepository.createWithSchedule(
      {
        loanNumber,
        loanName: input.loanName,
        lenderName: input.lenderName,
        loanType: input.loanType,
        vehicleId: input.vehicleId,
        fixedAssetId: input.fixedAssetId,
        capitalPartnerId: input.capitalPartnerId,
        loanStartDate: toDateOnly(input.loanStartDate),
        principalAmount: input.principalAmount,
        interestRatePercent,
        tenureMonths: input.tenureMonths,
        emiAmount,
        firstEmiDate,
        fundAccountType: fundAccount.type,
        fundAccountId: fundAccount.id,
        loanAccountRef: input.loanAccountRef,
        remarks: input.remarks,
        origin: input.origin ?? 'NEW',
        originalPrincipal: isOpening ? input.originalPrincipal ?? input.principalAmount : null,
        openingAsOfDate: isOpening ? toDateOnly(input.openingAsOfDate ?? input.loanStartDate) : null,
        migrationSource: isOpening ? input.migrationSource ?? 'Tally Migration' : null,
        migrationStatus: isOpening ? input.migrationStatus ?? 'UNVERIFIED' : null,
        organizationId,
        createdById: actorId,
        updatedById: actorId,
      },
      schedule.map((s) => ({
        installmentNo: s.installmentNo,
        dueDate: s.dueDate,
        emiAmount: s.emiAmount,
        principalComponent: s.principalComponent,
        interestComponent: s.interestComponent,
        createdById: actorId,
        updatedById: actorId,
      }))
    );

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'Loan',
      entityId: loan.id,
      description: isOpening
        ? `Registered opening ${input.loanType.replace(/_/g, ' ').toLowerCase()} ${loan.loanNumber} — ${input.lenderName}, ${input.principalAmount} still owed over ${input.tenureMonths} remaining EMIs`
        : `Created ${input.loanType.replace(/_/g, ' ').toLowerCase()} ${loan.loanNumber} — ${input.lenderName}, ${input.principalAmount} over ${input.tenureMonths} months`,
    });

    return loanService.getById(loan.id);
  },

  async update(id: string, input: UpdateLoanInput, actorId: string) {
    const existing = await loanRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Loan not found', 404);

    if (input.fundAccountId || input.fundAccountType) {
      const organizationId = await organizationService.resolveOrganizationId(undefined);
      const account = await resolveFundAccount(
        organizationId,
        input.fundAccountType ?? existing.fundAccountType,
        input.fundAccountId ?? existing.fundAccountId
      );
      if (!account.isActive) throw new AppError('The selected payment account is inactive', 409);
    }

    await loanRepository.update(id, { ...input, updatedById: actorId });
    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'Loan', entityId: id, description: `Updated loan ${existing.loanNumber}` });
    return loanService.getById(id);
  },

  async remove(id: string, actorId: string) {
    const existing = await loanRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Loan not found', 404);

    // Spec §28: financial history is reversed, never silently dropped.
    const paidCount = await loanRepository.countPaidInstallments(id);
    if (paidCount > 0) {
      throw new AppError(`This loan has ${paidCount} paid EMI ${paidCount === 1 ? 'installment' : 'installments'} — reverse them before deleting it.`, 409);
    }

    await loanRepository.softDelete(id, actorId);
    await auditService.record({ userId: actorId, action: 'DELETE', entityType: 'Loan', entityId: id, description: `Deleted loan ${existing.loanNumber}` });
  },

  async payEmi(loanId: string, installmentId: string, input: PayEmiInput, actorId: string) {
    const loan = await loanRepository.findByIdBasic(loanId);
    if (!loan) throw new AppError('Loan not found', 404);
    if (loan.status !== 'ACTIVE') throw new AppError(`This loan is ${loan.status.toLowerCase()} — no further EMI can be paid`, 409);

    const installment = await loanRepository.findInstallment(loanId, installmentId);
    if (!installment) throw new AppError('EMI installment not found on this loan', 404);
    if (installment.status === 'PAID') throw new AppError(`EMI ${installment.installmentNo} has already been paid`, 409);
    if (installment.status === 'WAIVED') throw new AppError(`EMI ${installment.installmentNo} was waived`, 409);

    const paidAmount = input.paidAmount ?? Number(installment.emiAmount);
    const principalComponent = input.principalComponent ?? Number(installment.principalComponent);
    const interestComponent = input.interestComponent ?? Number(installment.interestComponent);

    if (Math.abs(principalComponent + interestComponent - paidAmount) > EPS) {
      throw new AppError(
        `Principal (${principalComponent}) + Interest (${interestComponent}) must equal the EMI amount (${paidAmount}).`,
        422
      );
    }

    // Cannot repay more principal than is actually left owing.
    const fullLoan = await loanRepository.findById(loanId);
    const outstanding = loanTotals(fullLoan!).outstandingPrincipal;
    if (principalComponent - outstanding > EPS) {
      throw new AppError(`Principal of ${principalComponent} exceeds the outstanding balance of ${outstanding}.`, 422);
    }

    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const fundAccount = await resolveFundAccount(organizationId, input.fundAccountType, input.fundAccountId);
    if (!fundAccount.isActive) throw new AppError('The selected payment account is inactive', 409);

    const paidDate = input.paidDate ? toDateOnly(input.paidDate) : new Date();

    // Money out first: adjustFundAccountBalance throws on an overdrawn cash
    // account, and nothing should be marked paid if the money isn't there.
    await adjustFundAccountBalance(fundAccount.type, fundAccount.id, -paidAmount);

    const financialEntryId = await recordEmiFinancialEntry({
      organizationId,
      loan,
      installmentId,
      installmentNo: installment.installmentNo,
      amount: paidAmount,
      paidDate,
      fundAccountType: fundAccount.type,
      fundAccountId: fundAccount.id,
      fundAccountLabel: fundAccount.label,
      paymentModeId: input.paymentModeId,
      referenceNumber: input.referenceNumber,
      actorId,
    });

    await loanRepository.updateInstallment(installmentId, {
      status: 'PAID',
      paidDate,
      paidAmount,
      principalComponent,
      interestComponent,
      fundAccountType: fundAccount.type,
      fundAccountId: fundAccount.id,
      paymentModeId: input.paymentModeId,
      referenceNumber: input.referenceNumber,
      remarks: input.remarks,
      financialEntryId,
      updatedById: actorId,
    });

    // A fully repaid loan closes itself rather than waiting to be tidied up.
    const refreshed = await loanRepository.findById(loanId);
    if (refreshed && loanTotals(refreshed).outstandingPrincipal <= EPS) {
      await loanRepository.update(loanId, { status: 'CLOSED', updatedById: actorId });
    }

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'LoanInstallment',
      entityId: installmentId,
      description: `Paid EMI ${installment.installmentNo} of ${loan.loanNumber}: ${paidAmount} (principal ${principalComponent}, interest ${interestComponent}) from ${fundAccount.label}`,
    });

    return loanService.getById(loanId);
  },

  /** Undoes a paid EMI: refunds the fund account, reverses the FinancialEntry and returns the installment to PENDING. */
  async reverseEmi(loanId: string, installmentId: string, actorId: string) {
    const loan = await loanRepository.findByIdBasic(loanId);
    if (!loan) throw new AppError('Loan not found', 404);

    const installment = await loanRepository.findInstallment(loanId, installmentId);
    if (!installment) throw new AppError('EMI installment not found on this loan', 404);
    if (installment.status !== 'PAID') throw new AppError(`EMI ${installment.installmentNo} is not paid — there is nothing to reverse`, 409);

    if (installment.fundAccountType && installment.fundAccountId) {
      await adjustFundAccountBalance(installment.fundAccountType, installment.fundAccountId, Number(installment.paidAmount ?? 0));
    }

    if (installment.financialEntryId) {
      await prisma.financialEntry.update({
        where: { id: installment.financialEntryId },
        data: {
          status: 'REVERSED',
          cancelledById: actorId,
          cancelledAt: new Date(),
          cancellationReason: `EMI ${installment.installmentNo} of ${loan.loanNumber} was reversed`,
          updatedById: actorId,
        },
      });
    }

    await loanRepository.updateInstallment(installmentId, {
      status: installment.dueDate < new Date() ? 'OVERDUE' : 'PENDING',
      paidDate: null,
      paidAmount: null,
      fundAccountType: null,
      fundAccountId: null,
      paymentModeId: null,
      referenceNumber: null,
      financialEntryId: null,
      updatedById: actorId,
    });

    // Reversing an EMI on a loan that auto-closed puts it back in play.
    if (loan.status === 'CLOSED') {
      await loanRepository.update(loanId, { status: 'ACTIVE', updatedById: actorId });
    }

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'LoanInstallment',
      entityId: installmentId,
      description: `Reversed EMI ${installment.installmentNo} of ${loan.loanNumber}`,
    });

    return loanService.getById(loanId);
  },
};
