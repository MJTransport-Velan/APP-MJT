/**
 * Diesel / Fuel Card prepaid account.
 *
 * One shared account stands behind every fuel card in the fleet, exactly
 * like the FastTag wallet: a recharge tops up one balance, and whichever
 * card is swiped draws down from that same balance. There is deliberately
 * no per-card balance — a per-card figure here is only how much of the one
 * balance that card has spent.
 *
 * RECHARGE / REFUND / ADJUSTMENT are entered by hand on this screen.
 * USAGE is not: it belongs to the fuel entry that was billed to a card, so
 * fuel-entry.service writes, updates and removes those rows through
 * fuelCardAccountInternalService below. That way the fill is corrected in
 * one place and the balance follows, instead of the two drifting apart.
 *
 * A USAGE row is a drawdown of prepaid money, NOT a second cost — the fuel
 * entry already mirrors the spend into VehicleExpense, and nothing here
 * mirrors it again.
 */
import { Request } from 'express';
import { FuelCardTransactionType, FuelBillingMethod } from '@prisma/client';
import {
  fuelCardAccountRepository,
  FuelCardAccountRow,
  FuelCardTransactionWithRelations,
} from '../repositories/fuel-card-account.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { organizationService } from './organization.service';
import { resolveOrDefaultFundAccount, adjustFundAccountBalance } from '../utils/fundAccount.util';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import {
  RechargeFuelCardAccountInput,
  RefundFuelCardAccountInput,
  AdjustFuelCardAccountInput,
  UpdateFuelCardTransactionInput,
} from '../validators/fuel-card-account.validator';

/**
 * Which billing methods actually spend the prepaid account. FUEL_CARD is a
 * physical swipe and OTP is the same account authorized through the fuel
 * company's app — both are the card account paying. DIRECT_PAYMENT is the
 * driver's own cash/UPI at the pump and never touches this balance.
 */
const CARD_BILLED_METHODS: FuelBillingMethod[] = ['FUEL_CARD', 'OTP'];

export function isCardBilled(billingMethod: FuelBillingMethod | null | undefined): boolean {
  return billingMethod != null && CARD_BILLED_METHODS.includes(billingMethod);
}

function serializeAccount(a: FuelCardAccountRow) {
  return {
    id: a.id,
    accountRef: a.accountRef,
    currentBalance: a.currentBalance,
    isActive: a.isActive,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

function serializeTransaction(t: FuelCardTransactionWithRelations) {
  return {
    id: t.id,
    accountId: t.accountId,
    type: t.type,
    amount: t.amount,
    fuelCard: t.fuelCard ? { id: t.fuelCard.id, cardNumber: t.fuelCard.cardNumber } : null,
    vehicle: t.vehicle ? { id: t.vehicle.id, registrationNumber: t.vehicle.registrationNumber } : null,
    fuelEntry: t.fuelEntry
      ? {
          id: t.fuelEntry.id,
          entryDate: t.fuelEntry.entryDate,
          quantityLiters: t.fuelEntry.quantityLiters,
          location: t.fuelEntry.location,
        }
      : null,
    transactionDate: t.transactionDate,
    referenceNumber: t.referenceNumber,
    remarks: t.remarks,
    fundAccountType: t.fundAccountType,
    fundAccountId: t.fundAccountId,
    createdAt: t.createdAt,
  };
}

/**
 * Signed contribution to the account's currentBalance. ADJUSTMENT rows are
 * stored pre-signed (see adjust()) so this stays a pure function of type —
 * every other type has a fixed sign implied by what it means.
 */
function balanceDelta(type: FuelCardTransactionType, amount: number): number {
  return type === 'USAGE' ? -amount : amount;
}

/** USAGE belongs to a fuel entry; correcting it here would desync the fill it came from. */
function assertManualType(type: FuelCardTransactionType) {
  if (type === 'USAGE') {
    throw new AppError(
      'This drawdown belongs to a fuel entry billed to a card — edit or delete that fuel entry instead, and the balance follows.',
      409
    );
  }
}

export const fuelCardAccountService = {
  async getAccount(actorId: string) {
    const account = await fuelCardAccountRepository.getOrCreateAccount(actorId);
    return serializeAccount(account);
  },

  async listTransactions(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    // "to" arrives as a date-only string (YYYY-MM-DD, parsed as UTC
    // midnight) — push it to the end of that day so the whole day counts.
    let to: Date | undefined;
    if (query.to) {
      to = new Date(query.to as string);
      to.setUTCHours(23, 59, 59, 999);
    }
    const { rows, total } = await fuelCardAccountRepository.findTransactionsPaginated({
      skip,
      take,
      fuelCardId: (query.fuelCardId as string) || undefined,
      vehicleId: (query.vehicleId as string) || undefined,
      type: (query.type as never) || undefined,
      from: query.from ? new Date(query.from as string) : undefined,
      to,
    });
    return { data: rows.map(serializeTransaction), meta: buildPaginationMeta(page, pageSize, total) };
  },

  /**
   * Balance plus the totals behind it, and a card-wise breakdown of what
   * each card has spent — the balance itself is shared, so the breakdown is
   * spend, never a per-card balance.
   */
  async accountSummary(actorId: string) {
    const account = await fuelCardAccountRepository.getOrCreateAccount(actorId);
    const [totals, byCard] = await Promise.all([
      fuelCardAccountRepository.accountTotals(account.id),
      fuelCardAccountRepository.usageByCard(account.id),
    ]);

    const byType: Record<string, number> = { RECHARGE: 0, USAGE: 0, REFUND: 0, ADJUSTMENT: 0 };
    for (const row of totals) byType[row.type] = Number(row._sum.amount || 0);

    const cardIds = byCard.map((row) => row.fuelCardId).filter((id): id is string => !!id);
    const cards = cardIds.length ? await fuelCardAccountRepository.findCardsByIds(cardIds) : [];
    const cardById = new Map(cards.map((c) => [c.id, c]));

    const cardUsage = byCard
      .map((row) => ({
        fuelCardId: row.fuelCardId,
        cardNumber: row.fuelCardId ? cardById.get(row.fuelCardId)?.cardNumber ?? 'Deleted card' : 'No card recorded',
        issuedTo: row.fuelCardId ? cardById.get(row.fuelCardId)?.issuedTo ?? null : null,
        totalUsage: Number(row._sum.amount || 0),
        transactionCount: row._count._all,
      }))
      .sort((a, b) => b.totalUsage - a.totalUsage);

    return {
      accountId: account.id,
      currentBalance: account.currentBalance,
      totalRecharge: byType.RECHARGE,
      totalUsage: byType.USAGE,
      totalRefund: byType.REFUND,
      totalAdjustment: byType.ADJUSTMENT,
      cardUsage,
    };
  },

  /**
   * Recharge directly debits the chosen Bank/Cash account and tops up the
   * shared prepaid balance. No card is named on purpose — the money is
   * available to every card, which is the whole point of one account.
   */
  async recharge(input: RechargeFuelCardAccountInput, actorId: string) {
    const account = await fuelCardAccountRepository.getOrCreateAccount(actorId);

    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const fundAccount = await resolveOrDefaultFundAccount(organizationId, input.fundAccountType, input.fundAccountId);
    if (!fundAccount.isActive) throw new AppError('The selected Bank/Cash account is inactive', 409);

    await adjustFundAccountBalance(fundAccount.type, fundAccount.id, -input.amount);

    const transaction = await fuelCardAccountRepository.createTransaction({
      accountId: account.id,
      type: 'RECHARGE',
      amount: input.amount,
      transactionDate: input.transactionDate ? new Date(input.transactionDate) : new Date(),
      referenceNumber: input.referenceNumber,
      remarks: input.remarks,
      fundAccountType: fundAccount.type,
      fundAccountId: fundAccount.id,
      createdById: actorId,
      updatedById: actorId,
    });
    await fuelCardAccountRepository.adjustBalance(account.id, input.amount);

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'FuelCardTransaction',
      entityId: transaction.id,
      description: `Recharged the diesel card account with ${input.amount} from ${fundAccount.label}`,
    });
    return fuelCardAccountService.getAccount(actorId);
  },

  /** Money the fuel company credited back — tops the shared balance up again without touching Bank/Cash. */
  async refund(input: RefundFuelCardAccountInput, actorId: string) {
    const account = await fuelCardAccountRepository.getOrCreateAccount(actorId);
    if (input.fuelCardId) {
      const card = await fuelCardAccountRepository.findCardById(input.fuelCardId);
      if (!card) throw new AppError('Fuel card not found', 404);
    }
    if (input.vehicleId) {
      const vehicle = await fuelCardAccountRepository.findVehicleById(input.vehicleId);
      if (!vehicle) throw new AppError('Vehicle not found', 404);
    }

    const transaction = await fuelCardAccountRepository.createTransaction({
      accountId: account.id,
      type: 'REFUND',
      amount: input.amount,
      fuelCardId: input.fuelCardId,
      vehicleId: input.vehicleId,
      transactionDate: input.transactionDate ? new Date(input.transactionDate) : new Date(),
      referenceNumber: input.referenceNumber,
      remarks: input.remarks,
      createdById: actorId,
      updatedById: actorId,
    });
    await fuelCardAccountRepository.adjustBalance(account.id, input.amount);

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'FuelCardTransaction',
      entityId: transaction.id,
      description: `Refunded ${input.amount} to the diesel card account`,
    });
    return fuelCardAccountService.getAccount(actorId);
  },

  /**
   * Manual correction against the fuel company's own statement — always
   * requires remarks. Stored pre-signed (amount can be negative) so edit
   * and delete can reverse it unambiguously later.
   */
  async adjust(input: AdjustFuelCardAccountInput, actorId: string) {
    const account = await fuelCardAccountRepository.getOrCreateAccount(actorId);
    const signedAmount = input.direction === 'DECREASE' ? -input.amount : input.amount;

    const transaction = await fuelCardAccountRepository.createTransaction({
      accountId: account.id,
      type: 'ADJUSTMENT',
      amount: signedAmount,
      transactionDate: input.transactionDate ? new Date(input.transactionDate) : new Date(),
      remarks: input.remarks,
      createdById: actorId,
      updatedById: actorId,
    });
    await fuelCardAccountRepository.adjustBalance(account.id, signedAmount);

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'FuelCardTransaction',
      entityId: transaction.id,
      description: `Adjusted the diesel card account balance by ${signedAmount}: ${input.remarks}`,
    });
    return fuelCardAccountService.getAccount(actorId);
  },

  /**
   * Edits a hand-entered transaction. Reverses its old effect on the shared
   * balance (and, for a RECHARGE, on whichever Bank/Cash account it
   * originally debited) and re-applies the new one, so nothing drifts.
   */
  async updateTransaction(transactionId: string, input: UpdateFuelCardTransactionInput, actorId: string) {
    const existing = await fuelCardAccountRepository.findTransactionById(transactionId);
    if (!existing) throw new AppError('Diesel card transaction not found', 404);
    assertManualType(existing.type);

    if (input.fuelCardId) {
      const card = await fuelCardAccountRepository.findCardById(input.fuelCardId);
      if (!card) throw new AppError('Fuel card not found', 404);
    }
    if (input.vehicleId) {
      const vehicle = await fuelCardAccountRepository.findVehicleById(input.vehicleId);
      if (!vehicle) throw new AppError('Vehicle not found', 404);
    }

    const oldAmount = Number(existing.amount);
    // An ADJUSTMENT is stored pre-signed, so a new amount keeps the
    // direction the row was created with rather than flipping it silently.
    const newAmount =
      input.amount === undefined
        ? oldAmount
        : existing.type === 'ADJUSTMENT' && oldAmount < 0
          ? -input.amount
          : input.amount;
    const oldDelta = balanceDelta(existing.type, oldAmount);
    const newDelta = balanceDelta(existing.type, newAmount);

    let fundAccountType = existing.fundAccountType;
    let fundAccountId = existing.fundAccountId;
    if (existing.type === 'RECHARGE') {
      const organizationId = await organizationService.resolveOrganizationId(undefined);
      // Reverse whatever the original recharge debited...
      if (existing.fundAccountType && existing.fundAccountId) {
        await adjustFundAccountBalance(existing.fundAccountType as 'BANK' | 'CASH', existing.fundAccountId, oldAmount);
      }
      // ...then re-apply against the (possibly same, possibly newly chosen) account for the new amount.
      const fundAccount = await resolveOrDefaultFundAccount(
        organizationId,
        (input.fundAccountType as 'BANK' | 'CASH' | undefined) ?? (existing.fundAccountType as 'BANK' | 'CASH' | undefined),
        input.fundAccountId ?? existing.fundAccountId ?? undefined
      );
      if (!fundAccount.isActive) throw new AppError('The selected Bank/Cash account is inactive', 409);
      await adjustFundAccountBalance(fundAccount.type, fundAccount.id, -newAmount);
      fundAccountType = fundAccount.type;
      fundAccountId = fundAccount.id;
    }

    await fuelCardAccountRepository.adjustBalance(existing.accountId, newDelta - oldDelta);

    const updated = await fuelCardAccountRepository.updateTransaction(transactionId, {
      amount: newAmount,
      fuelCardId: input.fuelCardId !== undefined ? input.fuelCardId : undefined,
      vehicleId: input.vehicleId !== undefined ? input.vehicleId : undefined,
      transactionDate: input.transactionDate ? new Date(input.transactionDate) : undefined,
      referenceNumber: input.referenceNumber !== undefined ? input.referenceNumber : undefined,
      remarks: input.remarks !== undefined ? input.remarks : undefined,
      fundAccountType,
      fundAccountId,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'FuelCardTransaction',
      entityId: transactionId,
      description: `Edited diesel card ${existing.type.toLowerCase()} transaction`,
    });
    return serializeTransaction(updated);
  },

  /**
   * Reverses the transaction's effect on the shared balance (and, for a
   * RECHARGE, on the Bank/Cash account it debited) before removing the row
   * — a delete must never leave a silent balance discrepancy behind.
   */
  async deleteTransaction(transactionId: string, actorId: string) {
    const existing = await fuelCardAccountRepository.findTransactionById(transactionId);
    if (!existing) throw new AppError('Diesel card transaction not found', 404);
    assertManualType(existing.type);

    const delta = balanceDelta(existing.type, Number(existing.amount));
    await fuelCardAccountRepository.adjustBalance(existing.accountId, -delta);

    if (existing.type === 'RECHARGE' && existing.fundAccountType && existing.fundAccountId) {
      await adjustFundAccountBalance(
        existing.fundAccountType as 'BANK' | 'CASH',
        existing.fundAccountId,
        Number(existing.amount)
      );
    }

    await fuelCardAccountRepository.deleteTransaction(transactionId);

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'FuelCardTransaction',
      entityId: transactionId,
      description: `Deleted diesel card ${existing.type.toLowerCase()} transaction of ${existing.amount}`,
    });
  },
};

/**
 * The USAGE half of the account, owned by fuel-entry.service. Kept apart
 * from the routed service above because no HTTP route may create, edit or
 * delete a drawdown directly: a card-billed fill and its drawdown are one
 * fact, entered once.
 */
export const fuelCardAccountInternalService = {
  /**
   * Brings the drawdown for one fuel entry in line with the fill as it now
   * stands — creating it when a fill first becomes card-billed and priced,
   * re-pointing and re-sizing it when either changes, and removing it when
   * the fill stops being either. Safe to call on every fuel entry write.
   */
  async syncFromFuelEntry(params: {
    fuelEntryId: string;
    vehicleId: string;
    fuelCardId: string | null;
    billingMethod: FuelBillingMethod | null;
    amount: number | null;
    entryDate: Date;
    actorId: string;
  }) {
    const existing = await fuelCardAccountRepository.findTransactionByFuelEntryId(params.fuelEntryId);
    const shouldDraw = isCardBilled(params.billingMethod) && params.amount != null && params.amount > 0;

    if (!shouldDraw) {
      if (existing) await fuelCardAccountInternalService.removeFromFuelEntry(params.fuelEntryId, params.actorId);
      return;
    }

    const amount = params.amount as number;

    if (!existing) {
      const account = await fuelCardAccountRepository.getOrCreateAccount(params.actorId);
      const transaction = await fuelCardAccountRepository.createTransaction({
        accountId: account.id,
        type: 'USAGE',
        amount,
        fuelCardId: params.fuelCardId,
        vehicleId: params.vehicleId,
        fuelEntryId: params.fuelEntryId,
        transactionDate: params.entryDate,
        createdById: params.actorId,
        updatedById: params.actorId,
      });
      await fuelCardAccountRepository.adjustBalance(account.id, -amount);
      await auditService.record({
        userId: params.actorId,
        action: 'CREATE',
        entityType: 'FuelCardTransaction',
        entityId: transaction.id,
        description: `Diesel card account debited ${amount} for a card-billed fuel entry`,
      });
      return;
    }

    const oldAmount = Number(existing.amount);
    if (oldAmount !== amount) {
      await fuelCardAccountRepository.adjustBalance(existing.accountId, oldAmount - amount);
    }
    await fuelCardAccountRepository.updateTransaction(existing.id, {
      amount,
      fuelCardId: params.fuelCardId,
      vehicleId: params.vehicleId,
      transactionDate: params.entryDate,
      updatedById: params.actorId,
    });
  },

  /** Credits the drawdown back and drops the row — used when a card-billed fuel entry is deleted or stops being card-billed. */
  async removeFromFuelEntry(fuelEntryId: string, actorId: string) {
    const existing = await fuelCardAccountRepository.findTransactionByFuelEntryId(fuelEntryId);
    if (!existing) return;

    await fuelCardAccountRepository.adjustBalance(existing.accountId, Number(existing.amount));
    await fuelCardAccountRepository.deleteTransaction(existing.id);
    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'FuelCardTransaction',
      entityId: existing.id,
      description: `Diesel card account credited back ${existing.amount} — its card-billed fuel entry no longer draws from the account`,
    });
  },
};
