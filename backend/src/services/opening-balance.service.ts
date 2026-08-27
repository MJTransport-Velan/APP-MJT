/**
 * Finance → Opening Balance & Migration (Phase 18).
 *
 *   OLD TALLY CLOSING POSITION
 *        ↓
 *   OPENING BALANCE & MIGRATION      ← this service
 *        ↓
 *   MJ TRANSPORT OPENING POSITION
 *        ↓
 *   NEW LIVE TRANSACTIONS
 *
 * The rule that shapes everything here: an opening balance is a POSITION,
 * not a transaction. Nothing in this file writes a FinancialEntry, an
 * Invoice, a Receipt or a SupplierPayment, so an opening amount can never
 * turn up as current-period income, expense, collection or payment
 * (§23 rules 1, 2, 3, 13). Old Tally history is never recreated (rule 10)
 * and a payment source that was never known is never guessed (rule 11).
 *
 * Where an opening amount belongs to a register that already exists it is
 * stored THERE and only reported here:
 *   • opening assets → FixedAsset.assetOrigin = OPENING
 *   • opening loans  → Loan.origin = OPENING
 *
 * Bank and Cash are the one category that writes through to another table:
 * BankAccount/CashAccount.currentBalance is a directly-maintained running
 * balance in this app (there is no dated ledger behind it), so the opening
 * amount has to be baked into it for "Opening + In − Out = Current" to
 * hold on every screen that already reads currentBalance. `appliedAmount`
 * records what this row has already pushed in, so editing it moves the
 * account by the difference instead of adding the whole figure twice.
 */
import { Request } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../middlewares/error.middleware';
import { openingBalanceRepository, OpeningBalanceWithRelations } from '../repositories/opening-balance.repository';
import { auditService } from './audit.service';
import { organizationService } from './organization.service';
import {
  CreateOpeningBalanceInput,
  UpdateOpeningBalanceInput,
  SaveMigrationInput,
  ReclassifyOpeningBalanceInput,
  MigrationRecordStatusValue,
} from '../validators/opening-balance.validator';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const EPS = 0.01;

function toDateOnly(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

/** Which link a category needs, and the business-language name of the thing it points at. */
const CATEGORY_LINK: Record<string, { field: 'bankAccountId' | 'cashAccountId' | 'companyId' | 'supplierId' | 'capitalPartnerId' | 'label'; label: string }> = {
  BANK: { field: 'bankAccountId', label: 'Bank Account' },
  CASH: { field: 'cashAccountId', label: 'Cash Account' },
  RECEIVABLE: { field: 'companyId', label: 'Customer' },
  PAYABLE: { field: 'supplierId', label: 'Supplier' },
  OWNER_FUNDS: { field: 'capitalPartnerId', label: 'Owner / Partner' },
  OTHER_ASSET: { field: 'label', label: 'Description' },
  OTHER_LIABILITY: { field: 'label', label: 'Description' },
  OTHER_EQUITY: { field: 'label', label: 'Description' },
};

/** A bank account can genuinely be overdrawn and past losses are negative equity; everything else must be a positive amount. */
const SIGNED_CATEGORIES = new Set(['BANK', 'OTHER_EQUITY']);

function entryName(e: OpeningBalanceWithRelations): string {
  if (e.bankAccount) return `${e.bankAccount.accountHolderName}${e.bankAccount.bankName ? ` — ${e.bankAccount.bankName}` : ''}`;
  if (e.cashAccount) return `${e.cashAccount.cashAccountType} Cash`;
  if (e.company) return e.company.name;
  if (e.supplier) return e.supplier.name;
  if (e.capitalPartner) return e.capitalPartner.name;
  return e.label || 'Opening Balance';
}

function serialize(e: OpeningBalanceWithRelations) {
  return {
    id: e.id,
    migrationId: e.migrationId,
    category: e.category,
    name: entryName(e),
    amount: Number(e.amount),
    bankAccountId: e.bankAccountId,
    cashAccountId: e.cashAccountId,
    companyId: e.companyId,
    supplierId: e.supplierId,
    capitalPartnerId: e.capitalPartnerId,
    label: e.label,
    classification: e.classification,
    status: e.status,
    source: e.source,
    referenceNumber: e.referenceNumber,
    referenceDate: e.referenceDate,
    remarks: e.remarks,
    appliedAmount: Number(e.appliedAmount),
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

function serializeMigration(m: {
  id: string;
  migrationDate: Date;
  previousSystem: string;
  previousClosingDate: Date | null;
  notes: string | null;
  status: string;
  finalizedAt: Date | null;
}) {
  return {
    id: m.id,
    migrationDate: m.migrationDate,
    previousSystem: m.previousSystem,
    previousClosingDate: m.previousClosingDate,
    notes: m.notes,
    status: m.status,
    finalizedAt: m.finalizedAt,
  };
}

/**
 * Pushes an opening bank/cash amount into the account's running balance.
 * `bakedIn` is what is already inside currentBalance for this account's
 * opening position — the row's own appliedAmount once it exists, or the
 * account's pre-existing openingBalance the first time (the migration
 * figure REPLACES whatever opening balance the account was created with,
 * rather than stacking on top of it).
 */
async function syncFundAccountOpening(params: {
  type: 'BANK' | 'CASH';
  accountId: string;
  newAmount: number;
  bakedIn: number;
}) {
  const delta = round2(params.newAmount - params.bakedIn);
  if (Math.abs(delta) < EPS) return;

  if (params.type === 'BANK') {
    await prisma.bankAccount.update({
      where: { id: params.accountId },
      data: { openingBalance: params.newAmount, currentBalance: { increment: delta } },
    });
    return;
  }

  const account = await prisma.cashAccount.findUnique({ where: { id: params.accountId }, select: { currentBalance: true, cashAccountType: true } });
  if (!account) throw new AppError('Cash Account not found', 404);
  const resulting = round2(Number(account.currentBalance) + delta);
  if (resulting < 0) {
    throw new AppError(
      `That opening balance would leave the ${account.cashAccountType} cash account at ${resulting.toFixed(2)}. Cash cannot go negative — ${Math.abs(delta).toFixed(2)} has already been spent from it.`,
      409
    );
  }
  await prisma.cashAccount.update({
    where: { id: params.accountId },
    data: { openingBalance: params.newAmount, currentBalance: { increment: delta } },
  });
}

async function requireMigration() {
  const migration = await openingBalanceRepository.findMigration();
  if (!migration) {
    throw new AppError('Set the migration date and previous system first — that is what these opening balances are dated from.', 409);
  }
  return migration;
}

/** Amount/link edits are locked once the opening position is finalized; classification and status stay open for later review (§20). */
function assertEditable(migration: { status: string }) {
  if (migration.status === 'FINALIZED') {
    throw new AppError('The migration is finalized. Reopen it before changing opening amounts.', 409);
  }
}

export const openingBalanceService = {
  // ------------------------------------------------------------- migration
  async getMigration() {
    const migration = await openingBalanceRepository.findMigration();
    return migration ? serializeMigration(migration) : null;
  },

  async saveMigration(input: SaveMigrationInput, actorId: string) {
    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const existing = await openingBalanceRepository.findMigration();

    const migrationDate = toDateOnly(input.migrationDate);
    const previousClosingDate = input.previousClosingDate ? toDateOnly(input.previousClosingDate) : null;
    if (previousClosingDate && previousClosingDate > migrationDate) {
      throw new AppError('The previous system closed after the migration date — those dates are the wrong way round.', 422);
    }

    if (existing) {
      assertEditable(existing);
      const updated = await openingBalanceRepository.updateMigration(existing.id, {
        migrationDate,
        previousSystem: input.previousSystem ?? existing.previousSystem,
        previousClosingDate,
        notes: input.notes ?? null,
        updatedById: actorId,
      });
      await auditService.record({
        userId: actorId,
        action: 'UPDATE',
        entityType: 'FinancialMigration',
        entityId: existing.id,
        description: `Updated migration from ${updated.previousSystem} — opening position dated ${input.migrationDate.slice(0, 10)}`,
      });
      return serializeMigration(updated);
    }

    const created = await openingBalanceRepository.createMigration({
      migrationDate,
      previousSystem: input.previousSystem ?? 'Tally',
      previousClosingDate,
      notes: input.notes,
      organizationId,
      createdById: actorId,
      updatedById: actorId,
    });
    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'FinancialMigration',
      entityId: created.id,
      description: `Started migration from ${created.previousSystem} — opening position dated ${input.migrationDate.slice(0, 10)}`,
    });
    return serializeMigration(created);
  },

  async finalize(actorId: string) {
    const migration = await requireMigration();
    if (migration.status === 'FINALIZED') throw new AppError('This migration is already finalized', 409);

    const summary = await openingBalanceService.summary();
    // Finalizing does not force the numbers to balance (§20) — it records
    // that the user is done entering them. An unreconciled difference is
    // reported, never silently absorbed.
    const updated = await openingBalanceRepository.updateMigration(migration.id, {
      status: 'FINALIZED',
      finalizedAt: new Date(),
      finalizedById: actorId,
      updatedById: actorId,
    });
    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'FinancialMigration',
      entityId: migration.id,
      description: `Finalized the opening position: assets ${summary.totals.totalAssets}, liabilities ${summary.totals.totalLiabilities}, capital ${summary.totals.totalCapital}, unreconciled ${summary.totals.difference}`,
    });
    return serializeMigration(updated);
  },

  async reopen(actorId: string) {
    const migration = await requireMigration();
    if (migration.status !== 'FINALIZED') throw new AppError('This migration is not finalized', 409);

    const updated = await openingBalanceRepository.updateMigration(migration.id, {
      status: 'DRAFT',
      finalizedAt: null,
      finalizedById: null,
      updatedById: actorId,
    });
    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'FinancialMigration',
      entityId: migration.id,
      description: 'Reopened the migration for further opening-balance edits',
    });
    return serializeMigration(updated);
  },

  // --------------------------------------------------------------- entries
  async listEntries(query: Request['query']) {
    const migration = await openingBalanceRepository.findMigration();
    if (!migration) return { migration: null, entries: [] };

    const rows = await openingBalanceRepository.findEntries({
      migrationId: migration.id,
      category: (query.category as string) || undefined,
      status: (query.status as string) || undefined,
    });
    const search = ((query.search as string) || '').trim().toLowerCase();
    const entries = rows.map(serialize).filter((e) => (search ? e.name.toLowerCase().includes(search) : true));
    return { migration: serializeMigration(migration), entries };
  },

  async getEntry(id: string) {
    const entry = await openingBalanceRepository.findEntryById(id);
    if (!entry) throw new AppError('Opening balance not found', 404);
    return serialize(entry);
  },

  async createEntry(input: CreateOpeningBalanceInput, actorId: string) {
    const migration = await requireMigration();
    assertEditable(migration);
    const organizationId = await organizationService.resolveOrganizationId(undefined);

    const link = CATEGORY_LINK[input.category];
    const linkValue = (input as Record<string, unknown>)[link.field];
    if (!linkValue) throw new AppError(`${link.label} is required for this opening balance`, 422);

    if (!SIGNED_CATEGORIES.has(input.category) && input.amount <= 0) {
      throw new AppError('Amount must be greater than 0', 422);
    }

    // The linked record must exist — an opening balance against a deleted
    // customer/supplier/account would never show up on any screen again.
    if (input.category === 'BANK') {
      const account = await prisma.bankAccount.findFirst({ where: { id: input.bankAccountId, deletedAt: null } });
      if (!account) throw new AppError('Bank Account not found', 404);
      const duplicate = await openingBalanceRepository.findFundAccountEntry({ bankAccountId: input.bankAccountId });
      if (duplicate) throw new AppError(`${account.accountHolderName} already has an opening balance — edit that one instead of adding a second.`, 409);
    }
    if (input.category === 'CASH') {
      const account = await prisma.cashAccount.findFirst({ where: { id: input.cashAccountId, deletedAt: null } });
      if (!account) throw new AppError('Cash Account not found', 404);
      const duplicate = await openingBalanceRepository.findFundAccountEntry({ cashAccountId: input.cashAccountId });
      if (duplicate) throw new AppError(`The ${account.cashAccountType} cash account already has an opening balance — edit that one instead of adding a second.`, 409);
    }
    if (input.category === 'RECEIVABLE') {
      const company = await prisma.company.findFirst({ where: { id: input.companyId, deletedAt: null } });
      if (!company) throw new AppError('Customer not found', 404);
    }
    if (input.category === 'PAYABLE') {
      const supplier = await prisma.supplier.findFirst({ where: { id: input.supplierId, deletedAt: null } });
      if (!supplier) throw new AppError('Supplier not found', 404);
    }
    if (input.category === 'OWNER_FUNDS') {
      const partner = await prisma.capitalPartner.findFirst({ where: { id: input.capitalPartnerId, deletedAt: null } });
      if (!partner) throw new AppError('Owner / Partner not found', 404);
    }

    const entry = await openingBalanceRepository.createEntry({
      migrationId: migration.id,
      category: input.category,
      amount: input.amount,
      bankAccountId: input.category === 'BANK' ? input.bankAccountId : null,
      cashAccountId: input.category === 'CASH' ? input.cashAccountId : null,
      companyId: input.category === 'RECEIVABLE' ? input.companyId : null,
      supplierId: input.category === 'PAYABLE' ? input.supplierId : null,
      capitalPartnerId: input.category === 'OWNER_FUNDS' ? input.capitalPartnerId : null,
      label: link.field === 'label' ? input.label : null,
      // Owner money defaults to "needs deciding" rather than to capital:
      // guessing here is exactly what overstates equity and hides debt (§9).
      classification: input.category === 'OWNER_FUNDS' ? input.classification ?? 'UNCLASSIFIED' : null,
      status: input.status ?? 'UNVERIFIED',
      source: input.source ?? 'Tally Migration',
      referenceNumber: input.referenceNumber,
      referenceDate: input.referenceDate ? toDateOnly(input.referenceDate) : null,
      remarks: input.remarks,
      organizationId,
      createdById: actorId,
      updatedById: actorId,
    });

    if (input.category === 'BANK' || input.category === 'CASH') {
      const accountId = (input.category === 'BANK' ? input.bankAccountId : input.cashAccountId)!;
      const account =
        input.category === 'BANK'
          ? await prisma.bankAccount.findUnique({ where: { id: accountId }, select: { openingBalance: true } })
          : await prisma.cashAccount.findUnique({ where: { id: accountId }, select: { openingBalance: true } });
      await syncFundAccountOpening({
        type: input.category,
        accountId,
        newAmount: input.amount,
        bakedIn: Number(account?.openingBalance ?? 0),
      });
      await openingBalanceRepository.updateEntry(entry.id, { appliedAmount: input.amount });
    }

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'OpeningBalance',
      entityId: entry.id,
      description: `Recorded opening ${input.category.replace(/_/g, ' ').toLowerCase()} for ${entryName(entry)}: ${input.amount}`,
    });

    return openingBalanceService.getEntry(entry.id);
  },

  async updateEntry(id: string, input: UpdateOpeningBalanceInput, actorId: string) {
    const migration = await requireMigration();
    const existing = await openingBalanceRepository.findEntryById(id);
    if (!existing) throw new AppError('Opening balance not found', 404);

    const amountChanged = input.amount !== undefined && Math.abs(Number(input.amount) - Number(existing.amount)) > EPS;
    // Status/classification stay editable after finalizing (§20/§21); the
    // figures themselves do not.
    if (amountChanged) assertEditable(migration);

    if (input.amount !== undefined && !SIGNED_CATEGORIES.has(existing.category) && input.amount <= 0) {
      throw new AppError('Amount must be greater than 0', 422);
    }

    if (amountChanged && (existing.category === 'BANK' || existing.category === 'CASH')) {
      await syncFundAccountOpening({
        type: existing.category,
        accountId: (existing.bankAccountId ?? existing.cashAccountId)!,
        newAmount: Number(input.amount),
        bakedIn: Number(existing.appliedAmount),
      });
    }

    await openingBalanceRepository.updateEntry(id, {
      amount: input.amount,
      appliedAmount: amountChanged && (existing.category === 'BANK' || existing.category === 'CASH') ? input.amount : undefined,
      label: input.label,
      classification: existing.category === 'OWNER_FUNDS' ? input.classification : undefined,
      status: input.status,
      source: input.source,
      referenceNumber: input.referenceNumber,
      referenceDate: input.referenceDate === undefined ? undefined : input.referenceDate === null ? null : toDateOnly(input.referenceDate),
      remarks: input.remarks,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'OpeningBalance',
      entityId: id,
      description: `Updated opening balance for ${entryName(existing)}${amountChanged ? `: ${Number(existing.amount)} → ${input.amount}` : ''}`,
    });

    return openingBalanceService.getEntry(id);
  },

  /**
   * Moves owner money between equity and liability after the fact — the
   * whole reason an opening owner amount is allowed to sit UNCLASSIFIED
   * instead of being forced into Capital on day one (§9).
   */
  async reclassify(id: string, input: ReclassifyOpeningBalanceInput, actorId: string) {
    const existing = await openingBalanceRepository.findEntryById(id);
    if (!existing) throw new AppError('Opening balance not found', 404);
    if (existing.category !== 'OWNER_FUNDS') {
      throw new AppError('Only owner / partner opening funds can be reclassified between capital and loan', 422);
    }

    await openingBalanceRepository.updateEntry(id, {
      classification: input.classification,
      status: 'RECLASSIFIED',
      remarks: input.remarks ?? existing.remarks,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'OpeningBalance',
      entityId: id,
      description: `Reclassified ${entryName(existing)}'s opening ${Number(existing.amount)} from ${existing.classification ?? 'UNCLASSIFIED'} to ${input.classification}`,
    });

    return openingBalanceService.getEntry(id);
  },

  async setStatus(id: string, status: MigrationRecordStatusValue, actorId: string) {
    const existing = await openingBalanceRepository.findEntryById(id);
    if (!existing) throw new AppError('Opening balance not found', 404);

    await openingBalanceRepository.updateEntry(id, { status, updatedById: actorId });
    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'OpeningBalance',
      entityId: id,
      description: `Marked ${entryName(existing)}'s opening balance ${status.replace(/_/g, ' ').toLowerCase()}`,
    });
    return openingBalanceService.getEntry(id);
  },

  async removeEntry(id: string, actorId: string) {
    const migration = await requireMigration();
    assertEditable(migration);
    const existing = await openingBalanceRepository.findEntryById(id);
    if (!existing) throw new AppError('Opening balance not found', 404);

    // Taking the opening balance back out of the account it was pushed into,
    // so the running balance never keeps money that no longer has a record.
    if (existing.category === 'BANK' || existing.category === 'CASH') {
      await syncFundAccountOpening({
        type: existing.category,
        accountId: (existing.bankAccountId ?? existing.cashAccountId)!,
        newAmount: 0,
        bakedIn: Number(existing.appliedAmount),
      });
    }

    await openingBalanceRepository.softDeleteEntry(id, actorId);
    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'OpeningBalance',
      entityId: id,
      description: `Deleted the opening balance for ${entryName(existing)} (${Number(existing.amount)})`,
    });
  },

  // ------------------------------------------------------- shared read side
  /**
   * The helpers below are what every other finance screen consumes, so an
   * opening receivable/payable/owner amount shows up in the Balance Sheet,
   * Accounts Dashboard, Receivables and Payables without any of them
   * knowing this table exists.
   *
   * `cutoff` honours a past-dated report: opening balances only exist from
   * the migration date onwards.
   */
  async openingRows(cutoff?: Date) {
    const migration = await openingBalanceRepository.findMigration();
    if (!migration) return [];
    if (cutoff && migration.migrationDate > cutoff) return [];
    return openingBalanceRepository.findEntries({ migrationId: migration.id });
  },

  async openingReceivables(cutoff?: Date) {
    const rows = (await openingBalanceService.openingRows(cutoff)).filter((r) => r.category === 'RECEIVABLE');
    const byCompany = new Map<string, { name: string; amount: number }>();
    for (const r of rows) {
      if (!r.companyId) continue;
      const existing = byCompany.get(r.companyId);
      byCompany.set(r.companyId, { name: r.company?.name ?? 'Unknown', amount: (existing?.amount ?? 0) + Number(r.amount) });
    }
    const total = round2(Array.from(byCompany.values()).reduce((s, v) => s + v.amount, 0));
    return { byCompany, total, rows };
  },

  async openingPayables(cutoff?: Date) {
    const rows = (await openingBalanceService.openingRows(cutoff)).filter((r) => r.category === 'PAYABLE');
    const bySupplier = new Map<string, { name: string; amount: number }>();
    for (const r of rows) {
      if (!r.supplierId) continue;
      const existing = bySupplier.get(r.supplierId);
      bySupplier.set(r.supplierId, { name: r.supplier?.name ?? 'Unknown', amount: (existing?.amount ?? 0) + Number(r.amount) });
    }
    const total = round2(Array.from(bySupplier.values()).reduce((s, v) => s + v.amount, 0));
    return { bySupplier, total, rows };
  },

  /**
   * Owner opening money, split the way the Balance Sheet has to report it.
   * UNCLASSIFIED is deliberately kept out of both capital and owner loan —
   * it is money in the business whose nature the user has not decided yet.
   */
  async openingOwnerFunds(cutoff?: Date) {
    const rows = (await openingBalanceService.openingRows(cutoff)).filter((r) => r.category === 'OWNER_FUNDS');
    const bucket = { CAPITAL: 0, OWNER_LOAN: 0, OTHER_LIABILITY: 0, UNCLASSIFIED: 0 } as Record<string, number>;
    const capitalRows: { id: string; name: string; amount: number }[] = [];
    const ownerLoanRows: { id: string; name: string; amount: number }[] = [];
    const unclassifiedRows: { id: string; name: string; amount: number }[] = [];

    for (const r of rows) {
      const classification = r.classification ?? 'UNCLASSIFIED';
      const amount = Number(r.amount);
      bucket[classification] = round2((bucket[classification] ?? 0) + amount);
      const row = { id: r.id, name: `${entryName(r)} (opening)`, amount: round2(amount) };
      if (classification === 'CAPITAL') capitalRows.push(row);
      else if (classification === 'OWNER_LOAN') ownerLoanRows.push(row);
      else if (classification === 'UNCLASSIFIED') unclassifiedRows.push(row);
    }

    return {
      capital: bucket.CAPITAL,
      ownerLoan: bucket.OWNER_LOAN,
      otherLiability: bucket.OTHER_LIABILITY,
      unclassified: bucket.UNCLASSIFIED,
      capitalRows,
      ownerLoanRows,
      unclassifiedRows,
      rows,
    };
  },

  /** Free-form section G rows: opening adjustments with no register of their own. */
  async openingOther(cutoff?: Date) {
    const rows = await openingBalanceService.openingRows(cutoff);
    const sum = (category: string) => round2(rows.filter((r) => r.category === category).reduce((s, r) => s + Number(r.amount), 0));
    const listOf = (category: string) =>
      rows.filter((r) => r.category === category).map((r) => ({ id: r.id, name: r.label || 'Opening adjustment', amount: round2(Number(r.amount)) }));
    return {
      otherAssets: sum('OTHER_ASSET'),
      otherLiabilities: sum('OTHER_LIABILITY'),
      otherEquity: sum('OTHER_EQUITY'),
      otherAssetRows: listOf('OTHER_ASSET'),
      otherLiabilityRows: listOf('OTHER_LIABILITY'),
      otherEquityRows: listOf('OTHER_EQUITY'),
    };
  },

  // --------------------------------------------------------------- summary
  /**
   * Migration Summary & Reconciliation (§20). This is the ONE place that is
   * allowed to report an opening position that does not balance: the
   * difference is shown as an unreconciled amount instead of being plugged
   * into equity, which is how a bad opening balance would otherwise hide
   * forever.
   */
  async summary() {
    const migration = await openingBalanceRepository.findMigration();
    if (!migration) {
      return {
        migration: null,
        bank: { total: 0, rows: [] as { id: string; name: string; amount: number; status: string }[] },
        cash: { total: 0, rows: [] as { id: string; name: string; amount: number; status: string }[] },
        assets: { bookValue: 0, grossCost: 0, accumulatedDepreciation: 0, count: 0 },
        receivables: { total: 0, count: 0 },
        payables: { total: 0, count: 0 },
        loans: { openingOutstanding: 0, currentOutstanding: 0, originalPrincipal: 0, count: 0 },
        ownerFunds: { capital: 0, ownerLoan: 0, otherLiability: 0, unclassified: 0, total: 0 },
        other: { otherAssets: 0, otherLiabilities: 0, otherEquity: 0 },
        statusCounts: { CONFIRMED: 0, NEEDS_REVIEW: 0, UNVERIFIED: 0, RECLASSIFIED: 0 },
        totals: { totalAssets: 0, totalLiabilities: 0, totalCapital: 0, difference: 0, reconciled: true, unclassifiedAmount: 0 },
      };
    }

    const [rows, openingAssets, openingLoans] = await Promise.all([
      openingBalanceRepository.findEntries({ migrationId: migration.id }),
      openingBalanceRepository.findOpeningAssets(),
      openingBalanceRepository.findOpeningLoans(),
    ]);

    const inCategory = (category: string) => rows.filter((r) => r.category === category);
    const sumOf = (category: string) => round2(inCategory(category).reduce((s, r) => s + Number(r.amount), 0));
    const listOf = (category: string) =>
      inCategory(category).map((r) => ({ id: r.id, name: entryName(r), amount: round2(Number(r.amount)), status: r.status as string }));

    const bankTotal = sumOf('BANK');
    const cashTotal = sumOf('CASH');
    const receivableTotal = sumOf('RECEIVABLE');
    const payableTotal = sumOf('PAYABLE');

    // An opening asset's original cost is purchaseValue and its book value
    // on the migration date is currentValue, so accumulated depreciation is
    // the difference — never a separately stored figure that can drift.
    const grossCost = round2(openingAssets.reduce((s, a) => s + Number(a.purchaseValue), 0));
    const bookValue = round2(openingAssets.reduce((s, a) => s + Number(a.currentValue), 0));

    const loanOpening = round2(openingLoans.reduce((s, l) => s + Number(l.principalAmount), 0));
    const loanOriginal = round2(openingLoans.reduce((s, l) => s + Number(l.originalPrincipal ?? l.principalAmount), 0));
    const loanCurrent = round2(
      openingLoans.reduce((s, l) => {
        const paidPrincipal = l.installments.filter((i) => i.status === 'PAID').reduce((t, i) => t + Number(i.principalComponent), 0);
        return s + Math.max(Number(l.principalAmount) - paidPrincipal, 0);
      }, 0)
    );

    const ownerBuckets = { CAPITAL: 0, OWNER_LOAN: 0, OTHER_LIABILITY: 0, UNCLASSIFIED: 0 } as Record<string, number>;
    for (const r of inCategory('OWNER_FUNDS')) {
      const key = (r.classification ?? 'UNCLASSIFIED') as string;
      ownerBuckets[key] = round2((ownerBuckets[key] ?? 0) + Number(r.amount));
    }

    const otherAssets = sumOf('OTHER_ASSET');
    const otherLiabilities = sumOf('OTHER_LIABILITY');
    const otherEquity = sumOf('OTHER_EQUITY');

    const statusCounts = { CONFIRMED: 0, NEEDS_REVIEW: 0, UNVERIFIED: 0, RECLASSIFIED: 0 } as Record<string, number>;
    for (const r of rows) statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
    for (const a of openingAssets) if (a.migrationStatus) statusCounts[a.migrationStatus] = (statusCounts[a.migrationStatus] ?? 0) + 1;
    for (const l of openingLoans) if (l.migrationStatus) statusCounts[l.migrationStatus] = (statusCounts[l.migrationStatus] ?? 0) + 1;

    const totalAssets = round2(bankTotal + cashTotal + bookValue + receivableTotal + otherAssets);
    // Unclassified owner money is counted on the funding side — it IS in the
    // business — but never as capital, and it is reported separately so the
    // user can see exactly how much is still undecided.
    const totalLiabilities = round2(loanOpening + payableTotal + ownerBuckets.OWNER_LOAN + ownerBuckets.OTHER_LIABILITY + otherLiabilities);
    const totalCapital = round2(ownerBuckets.CAPITAL + otherEquity);
    const difference = round2(totalAssets - (totalLiabilities + totalCapital + ownerBuckets.UNCLASSIFIED));

    return {
      migration: serializeMigration(migration),
      bank: { total: bankTotal, rows: listOf('BANK') },
      cash: { total: cashTotal, rows: listOf('CASH') },
      assets: {
        bookValue,
        grossCost,
        accumulatedDepreciation: round2(grossCost - bookValue),
        count: openingAssets.length,
      },
      receivables: { total: receivableTotal, count: inCategory('RECEIVABLE').length },
      payables: { total: payableTotal, count: inCategory('PAYABLE').length },
      loans: {
        openingOutstanding: loanOpening,
        currentOutstanding: loanCurrent,
        originalPrincipal: loanOriginal,
        count: openingLoans.length,
      },
      ownerFunds: {
        capital: ownerBuckets.CAPITAL,
        ownerLoan: ownerBuckets.OWNER_LOAN,
        otherLiability: ownerBuckets.OTHER_LIABILITY,
        unclassified: ownerBuckets.UNCLASSIFIED,
        total: round2(ownerBuckets.CAPITAL + ownerBuckets.OWNER_LOAN + ownerBuckets.OTHER_LIABILITY + ownerBuckets.UNCLASSIFIED),
      },
      other: { otherAssets, otherLiabilities, otherEquity },
      statusCounts,
      totals: {
        totalAssets,
        totalLiabilities,
        totalCapital,
        difference,
        reconciled: Math.abs(difference) < EPS,
        unclassifiedAmount: ownerBuckets.UNCLASSIFIED,
      },
    };
  },
};
