import { Request } from 'express';
import { FastTagTransactionType } from '@prisma/client';
import { fastTagRepository, FastTagAccountRow, FastTagTransactionWithRelations } from '../repositories/fasttag.repository';
import { tripRepository } from '../repositories/trip.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { organizationService } from './organization.service';
import { vehicleExpenseInternalService } from './vehicle-expense.service';
import { resolveOrDefaultFundAccount, adjustFundAccountBalance } from '../utils/fundAccount.util';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import {
  RechargeFastTagInput,
  LogFastTagUsageInput,
  RefundFastTagInput,
  AdjustFastTagInput,
  UpdateFastTagTransactionInput,
} from '../validators/fasttag.validator';

function serializeWallet(a: FastTagAccountRow) {
  return {
    id: a.id,
    fastagNumber: a.fastagNumber,
    currentBalance: a.currentBalance,
    isActive: a.isActive,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

function serializeTransaction(t: FastTagTransactionWithRelations) {
  return {
    id: t.id,
    accountId: t.accountId,
    vehicle: t.vehicle ? { id: t.vehicle.id, registrationNumber: t.vehicle.registrationNumber } : null,
    type: t.type,
    status: t.status,
    amount: t.amount,
    trip: t.trip ? { id: t.trip.id, tripNumber: t.trip.tripNumber } : null,
    tollPlaza: t.tollPlaza,
    location: t.location,
    transactionReference: t.transactionReference,
    paymentSource: t.paymentSource,
    remarks: t.remarks,
    attachment: t.attachment,
    fundAccountType: t.fundAccountType,
    fundAccountId: t.fundAccountId,
    transactionDate: t.transactionDate,
    createdAt: t.createdAt,
  };
}

/**
 * Signed contribution to the wallet's currentBalance. ADJUSTMENT rows store
 * their amount pre-signed (see adjust()) so this stays a pure function of
 * type — every other type has a fixed sign implied by what it means.
 */
function balanceDelta(type: FastTagTransactionType, amount: number): number {
  return type === 'USAGE' ? -amount : amount;
}

export const fastTagService = {
  async getWallet(actorId: string) {
    const account = await fastTagRepository.getOrCreateWallet(actorId);
    return serializeWallet(account);
  },

  /** Vehicle + date filters (Truck / Date) are handled here via vehicleId/from/to. */
  async listTransactions(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    // "to" arrives as a date-only string (YYYY-MM-DD, parsed as UTC
    // midnight) — push it to the end of that day so the whole day is
    // included, not just the single instant at 00:00:00.000.
    let to: Date | undefined;
    if (query.to) {
      to = new Date(query.to as string);
      to.setUTCHours(23, 59, 59, 999);
    }
    const { rows, total } = await fastTagRepository.findTransactionsPaginated({
      skip,
      take,
      vehicleId: (query.vehicleId as string) || undefined,
      tripId: (query.tripId as string) || undefined,
      type: (query.type as never) || undefined,
      status: (query.status as never) || undefined,
      from: query.from ? new Date(query.from as string) : undefined,
      to,
    });
    return { data: rows.map(serializeTransaction), meta: buildPaginationMeta(page, pageSize, total) };
  },

  /** Total recharge / usage / refund / adjustment + current balance for the fleet's shared wallet. */
  async walletSummary(actorId: string) {
    const account = await fastTagRepository.getOrCreateWallet(actorId);
    const totals = await fastTagRepository.walletTotals(account.id);
    const byType: Record<string, number> = { RECHARGE: 0, USAGE: 0, REFUND: 0, ADJUSTMENT: 0 };
    for (const row of totals) byType[row.type] = Number(row._sum.amount || 0);
    return {
      accountId: account.id,
      currentBalance: account.currentBalance,
      totalRecharge: byType.RECHARGE,
      totalUsage: byType.USAGE,
      totalRefund: byType.REFUND,
      totalAdjustment: byType.ADJUSTMENT,
    };
  },

  /** Recharge directly debits the fund account and tops up the shared wallet's prepaid currentBalance — no ledger/voucher involved (design doc §6.9). */
  async recharge(input: RechargeFastTagInput, actorId: string) {
    const account = await fastTagRepository.getOrCreateWallet(actorId);

    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const fundAccount = await resolveOrDefaultFundAccount(organizationId, input.fundAccountType, input.fundAccountId);
    if (!fundAccount.isActive) throw new AppError('The selected Bank/Cash account is inactive', 409);

    await adjustFundAccountBalance(fundAccount.type, fundAccount.id, -input.amount);

    const transaction = await fastTagRepository.createTransaction({
      accountId: account.id,
      type: 'RECHARGE',
      status: 'VERIFIED',
      amount: input.amount,
      transactionReference: input.referenceNumber,
      remarks: input.remarks,
      fundAccountType: fundAccount.type,
      fundAccountId: fundAccount.id,
      createdById: actorId,
      updatedById: actorId,
    });
    await fastTagRepository.adjustBalance(account.id, input.amount);

    await auditService.record({ userId: actorId, action: 'CREATE', entityType: 'FastTagTransaction', entityId: transaction.id, description: `Recharged FastTag wallet with ${input.amount} from ${fundAccount.label}` });
    return fastTagService.getWallet(actorId);
  },

  /**
   * Usage (Toll Deduction) for a specific vehicle's tag. Decrements the
   * shared wallet's prepaid balance and mirrors into VehicleExpense
   * (category FASTTAG) so it flows through the same approval/posting gate
   * as any other vehicle cost — no voucher is posted here directly.
   */
  async logUsage(input: LogFastTagUsageInput, actorId: string) {
    const account = await fastTagRepository.getOrCreateWallet(actorId);
    const vehicle = await fastTagRepository.findVehicleById(input.vehicleId);
    if (!vehicle) throw new AppError('Vehicle not found', 404);

    const transactionDate = input.transactionDate ? new Date(input.transactionDate) : new Date();

    // Trip is mandatory for every toll usage — it's the vehicle's current
    // (still-running) trip if it has one, else whatever its last trip was,
    // unless the caller explicitly names one (e.g. a correction). A toll
    // charge with no trip context at all isn't allowed.
    let tripId = input.tripId;
    if (tripId) {
      const trip = await tripRepository.findById(tripId);
      if (!trip) throw new AppError('Trip not found', 404);
      if (trip.vehicleId !== input.vehicleId) {
        throw new AppError('The selected trip is not assigned to this vehicle', 422);
      }
    } else {
      const trip = await tripRepository.findCurrentOrLastTripForVehicle(input.vehicleId);
      if (!trip) {
        throw new AppError(`${vehicle.registrationNumber} has no trips yet — a trip is required to log toll usage`, 422);
      }
      tripId = trip.id;
    }

    const transaction = await fastTagRepository.createTransaction({
      accountId: account.id,
      vehicleId: input.vehicleId,
      type: 'USAGE',
      status: 'VERIFIED',
      amount: input.amount,
      tripId,
      transactionDate,
      tollPlaza: input.tollPlaza,
      location: input.location,
      transactionReference: input.transactionReference,
      paymentSource: input.paymentSource,
      remarks: input.remarks,
      createdById: actorId,
      updatedById: actorId,
    });
    await fastTagRepository.adjustBalance(account.id, -input.amount);

    await vehicleExpenseInternalService.logFromSource({
      vehicleId: input.vehicleId,
      tripId,
      category: 'FASTTAG',
      amount: input.amount,
      expenseDate: transaction.transactionDate,
      description: input.tollPlaza ? `FastTag toll usage at ${input.tollPlaza}` : 'FastTag toll usage',
      referenceType: 'FastTagTransaction',
      referenceId: transaction.id,
      actorId,
    });

    await auditService.record({ userId: actorId, action: 'CREATE', entityType: 'FastTagTransaction', entityId: transaction.id, description: `Logged FastTag usage of ${input.amount} for ${vehicle.registrationNumber}` });
    return fastTagService.getWallet(actorId);
  },

  /** Refund credited back to the wallet — offsets a previously recorded toll usage, does not touch Bank/Cash. */
  async refund(input: RefundFastTagInput, actorId: string) {
    const account = await fastTagRepository.getOrCreateWallet(actorId);
    if (input.vehicleId) {
      const vehicle = await fastTagRepository.findVehicleById(input.vehicleId);
      if (!vehicle) throw new AppError('Vehicle not found', 404);
    }

    const transaction = await fastTagRepository.createTransaction({
      accountId: account.id,
      vehicleId: input.vehicleId,
      type: 'REFUND',
      status: 'VERIFIED',
      amount: input.amount,
      tripId: input.tripId,
      transactionDate: input.transactionDate ? new Date(input.transactionDate) : new Date(),
      transactionReference: input.transactionReference,
      remarks: input.remarks,
      createdById: actorId,
      updatedById: actorId,
    });
    await fastTagRepository.adjustBalance(account.id, input.amount);

    await auditService.record({ userId: actorId, action: 'CREATE', entityType: 'FastTagTransaction', entityId: transaction.id, description: `Refunded ${input.amount} to FastTag wallet` });
    return fastTagService.getWallet(actorId);
  },

  /** Manual balance correction — always requires remarks. Stored pre-signed (amount can be negative) so edit/delete can reverse it unambiguously later. */
  async adjust(input: AdjustFastTagInput, actorId: string) {
    const account = await fastTagRepository.getOrCreateWallet(actorId);
    const signedAmount = input.direction === 'DECREASE' ? -input.amount : input.amount;

    const transaction = await fastTagRepository.createTransaction({
      accountId: account.id,
      type: 'ADJUSTMENT',
      status: 'ADJUSTED',
      amount: signedAmount,
      remarks: input.remarks,
      createdById: actorId,
      updatedById: actorId,
    });
    await fastTagRepository.adjustBalance(account.id, signedAmount);

    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'FastTagTransaction', entityId: transaction.id, description: `Adjusted FastTag wallet balance by ${signedAmount}: ${input.remarks}` });
    return fastTagService.getWallet(actorId);
  },

  async updateTransactionStatus(transactionId: string, status: string, remarks: string | undefined, actorId: string) {
    const existing = await fastTagRepository.findTransactionById(transactionId);
    if (!existing) throw new AppError('FastTag transaction not found', 404);

    const updated = await fastTagRepository.updateTransaction(transactionId, {
      status: status as never,
      remarks: remarks ?? existing.remarks,
      updatedById: actorId,
    });

    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'FastTagTransaction', entityId: transactionId, description: `FastTag transaction status changed to ${status}` });
    return serializeTransaction(updated);
  },

  async setAttachment(transactionId: string, filePath: string, actorId: string) {
    const existing = await fastTagRepository.findTransactionById(transactionId);
    if (!existing) throw new AppError('FastTag transaction not found', 404);

    const updated = await fastTagRepository.updateTransaction(transactionId, { attachment: filePath, updatedById: actorId });
    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'FastTagTransaction', entityId: transactionId, description: 'Attached document to FastTag transaction' });
    return serializeTransaction(updated);
  },

  /**
   * Generic edit. Type is fixed at creation (turning a RECHARGE into a
   * USAGE would need a different set of required fields and a different
   * balance-sign rule — delete + re-add covers that rare case instead).
   * Reverses the transaction's old effect on the wallet balance (and, for
   * a RECHARGE, on whichever Bank/Cash account it originally debited) and
   * re-applies the new one, so nothing silently drifts out of sync.
   */
  async updateTransaction(transactionId: string, input: UpdateFastTagTransactionInput, actorId: string) {
    const existing = await fastTagRepository.findTransactionById(transactionId);
    if (!existing) throw new AppError('FastTag transaction not found', 404);

    if (input.vehicleId) {
      const vehicle = await fastTagRepository.findVehicleById(input.vehicleId);
      if (!vehicle) throw new AppError('Vehicle not found', 404);
    }
    if (existing.type === 'USAGE' && input.vehicleId === null) {
      throw new AppError('A USAGE transaction must stay linked to a vehicle', 422);
    }
    if (existing.type === 'USAGE' && input.tripId === null) {
      throw new AppError('A USAGE transaction must stay linked to a trip', 422);
    }
    if (input.tripId) {
      const trip = await tripRepository.findById(input.tripId);
      if (!trip) throw new AppError('Trip not found', 404);
      const vehicleId = input.vehicleId !== undefined ? input.vehicleId : existing.vehicleId;
      if (vehicleId && trip.vehicleId !== vehicleId) {
        throw new AppError('The selected trip is not assigned to this vehicle', 422);
      }
    }

    const oldAmount = Number(existing.amount);
    const newAmount = input.amount !== undefined ? input.amount : oldAmount;
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
      // ...then re-apply against the (possibly same, possibly newly chosen) fund account for the new amount.
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

    await fastTagRepository.adjustBalance(existing.accountId, newDelta - oldDelta);

    const updated = await fastTagRepository.updateTransaction(transactionId, {
      vehicleId: input.vehicleId !== undefined ? input.vehicleId : undefined,
      amount: newAmount,
      tripId: input.tripId !== undefined ? input.tripId : undefined,
      transactionDate: input.transactionDate ? new Date(input.transactionDate) : undefined,
      tollPlaza: input.tollPlaza,
      location: input.location,
      transactionReference: input.transactionReference,
      paymentSource: input.paymentSource,
      remarks: input.remarks,
      fundAccountType,
      fundAccountId,
      updatedById: actorId,
    });

    if (existing.type === 'USAGE') {
      await vehicleExpenseInternalService.updateFromSource({
        referenceType: 'FastTagTransaction',
        referenceId: transactionId,
        vehicleId: updated.vehicleId ?? undefined,
        tripId: updated.tripId,
        amount: newAmount,
        expenseDate: updated.transactionDate,
        description: updated.tollPlaza ? `FastTag toll usage at ${updated.tollPlaza}` : 'FastTag toll usage',
        actorId,
      });
    }

    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'FastTagTransaction', entityId: transactionId, description: `Edited FastTag ${existing.type.toLowerCase()} transaction` });
    return serializeTransaction(updated);
  },

  /**
   * Reverses the transaction's effect on the wallet balance (and, for a
   * RECHARGE, on the Bank/Cash account it originally debited) before
   * removing the row — deleting a transaction must never leave a silent
   * balance discrepancy behind.
   */
  async deleteTransaction(transactionId: string, actorId: string) {
    const existing = await fastTagRepository.findTransactionById(transactionId);
    if (!existing) throw new AppError('FastTag transaction not found', 404);

    const delta = balanceDelta(existing.type, Number(existing.amount));
    await fastTagRepository.adjustBalance(existing.accountId, -delta);

    if (existing.type === 'RECHARGE' && existing.fundAccountType && existing.fundAccountId) {
      await adjustFundAccountBalance(existing.fundAccountType as 'BANK' | 'CASH', existing.fundAccountId, Number(existing.amount));
    }

    if (existing.type === 'USAGE') {
      await vehicleExpenseInternalService.removeFromSource({ referenceType: 'FastTagTransaction', referenceId: transactionId, actorId });
    }

    await fastTagRepository.deleteTransaction(transactionId);

    await auditService.record({ userId: actorId, action: 'DELETE', entityType: 'FastTagTransaction', entityId: transactionId, description: `Deleted FastTag ${existing.type.toLowerCase()} transaction of ${existing.amount}` });
  },
};
