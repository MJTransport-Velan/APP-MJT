/**
 * The fleet's AdBlue store.
 *
 * One shared store stands behind every truck, the same way the diesel card
 * account stands behind every fuel card: a purchase puts litres in, and
 * whichever truck is topped up takes litres out. There is deliberately no
 * per-truck stock — a per-truck figure here is only how much of the one
 * store that truck has drawn.
 *
 * Unlike the diesel card account, this store tracks two things rather than
 * one: litres on hand AND what those litres cost. Both have to move
 * together. A withdrawal that took the litres without taking their cost
 * would leave the average rate climbing forever, and the next issue would
 * be valued at a price the fleet never paid.
 *
 * PURCHASE / RETURN / ADJUSTMENT are entered by hand on this screen.
 * ISSUE is not: it belongs to the AdBlue entry that was filled from stock,
 * so adblue-entry.service writes, updates and removes those rows through
 * adBlueStockInternalService below. That way the top-up is corrected in one
 * place and the stock follows, instead of the two drifting apart.
 *
 * An ISSUE is a withdrawal of stock the fleet already paid for, NOT a
 * second cost — the AdBlue entry already mirrors the spend into
 * VehicleExpense, and nothing here mirrors it again.
 */
import { Request } from 'express';
import { AdBlueStockTransactionType } from '@prisma/client';
import {
  adBlueStockRepository,
  AdBlueStockRow,
  AdBlueStockTransactionWithRelations,
} from '../repositories/adblue-stock.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { organizationService } from './organization.service';
import { resolveOrDefaultFundAccount, adjustFundAccountBalance } from '../utils/fundAccount.util';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import {
  PurchaseAdBlueStockInput,
  ReturnAdBlueStockInput,
  AdjustAdBlueStockInput,
  UpdateAdBlueStockTransactionInput,
} from '../validators/adblue-stock.validator';

const round2 = (value: number) => Number(value.toFixed(2));

/**
 * What one litre in the store currently costs — total value over total
 * litres, a running weighted average. An empty store has no rate at all;
 * callers decide what that means for them rather than being handed a 0
 * that looks like a real price.
 */
function averageRate(stock: AdBlueStockRow): number | null {
  const quantity = Number(stock.currentQuantityLiters);
  if (quantity <= 0) return null;
  return round2(Number(stock.currentValue) / quantity);
}

function serializeStock(stock: AdBlueStockRow) {
  return {
    id: stock.id,
    currentQuantityLiters: Number(stock.currentQuantityLiters),
    currentValue: Number(stock.currentValue),
    averageRatePerLiter: averageRate(stock),
    isActive: stock.isActive,
    createdAt: stock.createdAt,
    updatedAt: stock.updatedAt,
  };
}

function serializeTransaction(t: AdBlueStockTransactionWithRelations) {
  return {
    id: t.id,
    stockId: t.stockId,
    type: t.type,
    quantityLiters: Number(t.quantityLiters),
    ratePerLiter: t.ratePerLiter == null ? null : Number(t.ratePerLiter),
    amount: Number(t.amount),
    vehicle: t.vehicle ? { id: t.vehicle.id, registrationNumber: t.vehicle.registrationNumber } : null,
    supplier: t.supplier ? { id: t.supplier.id, name: t.supplier.name } : null,
    adBlueEntry: t.adBlueEntry
      ? {
          id: t.adBlueEntry.id,
          entryDate: t.adBlueEntry.entryDate,
          quantityLiters: t.adBlueEntry.quantityLiters == null ? null : Number(t.adBlueEntry.quantityLiters),
          location: t.adBlueEntry.location,
        }
      : null,
    transactionDate: t.transactionDate,
    invoiceNumber: t.invoiceNumber,
    referenceNumber: t.referenceNumber,
    remarks: t.remarks,
    fundAccountType: t.fundAccountType,
    fundAccountId: t.fundAccountId,
    createdAt: t.createdAt,
  };
}

/**
 * Signed contribution to the store's litres and value. ADJUSTMENT rows are
 * stored pre-signed (see adjust()) so this stays a pure function of type —
 * every other type has a fixed direction implied by what it means.
 */
function stockDelta(type: AdBlueStockTransactionType, quantity: number, amount: number) {
  const outgoing = type === 'ISSUE' || type === 'RETURN';
  return outgoing ? { quantity: -quantity, value: -amount } : { quantity, value: amount };
}

/** ISSUE belongs to an AdBlue entry; correcting it here would desync the top-up it came from. */
function assertManualType(type: AdBlueStockTransactionType) {
  if (type === 'ISSUE') {
    throw new AppError(
      'This withdrawal belongs to an AdBlue entry filled from stock — edit or delete that entry instead, and the stock follows.',
      409
    );
  }
}

/**
 * Litres cannot be taken out of a store that does not hold them: a physical
 * drum either has the AdBlue in it or it does not. `alreadyReserved` is the
 * quantity an edit is putting back before it takes the new quantity out, so
 * re-saving an unchanged issue never trips this.
 */
function assertEnoughStock(stock: AdBlueStockRow, quantity: number, alreadyReserved = 0) {
  const available = Number(stock.currentQuantityLiters) + alreadyReserved;
  if (quantity > available) {
    throw new AppError(
      `The AdBlue store holds ${available.toFixed(2)} L, which is not enough for this ${quantity.toFixed(2)} L withdrawal.`,
      409
    );
  }
}

export const adBlueStockService = {
  async getStock(actorId: string) {
    const stock = await adBlueStockRepository.getOrCreateStock(actorId);
    return serializeStock(stock);
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
    const { rows, total } = await adBlueStockRepository.findTransactionsPaginated({
      skip,
      take,
      vehicleId: (query.vehicleId as string) || undefined,
      supplierId: (query.supplierId as string) || undefined,
      type: (query.type as never) || undefined,
      from: query.from ? new Date(query.from as string) : undefined,
      to,
    });
    return { data: rows.map(serializeTransaction), meta: buildPaginationMeta(page, pageSize, total) };
  },

  /**
   * What is on hand and the movements behind it, plus a truck-wise
   * breakdown of what each truck has drawn — the store is shared, so the
   * breakdown is consumption, never a per-truck balance.
   */
  async stockSummary(actorId: string) {
    const stock = await adBlueStockRepository.getOrCreateStock(actorId);
    const [totals, byVehicle] = await Promise.all([
      adBlueStockRepository.stockTotals(stock.id),
      adBlueStockRepository.issuesByVehicle(stock.id),
    ]);

    const byType: Record<string, { quantityLiters: number; amount: number }> = {
      PURCHASE: { quantityLiters: 0, amount: 0 },
      ISSUE: { quantityLiters: 0, amount: 0 },
      RETURN: { quantityLiters: 0, amount: 0 },
      ADJUSTMENT: { quantityLiters: 0, amount: 0 },
    };
    for (const row of totals) {
      byType[row.type] = {
        quantityLiters: round2(Number(row._sum.quantityLiters || 0)),
        amount: round2(Number(row._sum.amount || 0)),
      };
    }

    const vehicleIds = byVehicle.map((row) => row.vehicleId).filter((id): id is string => !!id);
    const vehicles = vehicleIds.length ? await adBlueStockRepository.findVehiclesByIds(vehicleIds) : [];
    const vehicleById = new Map(vehicles.map((v) => [v.id, v]));

    const vehicleUsage = byVehicle
      .map((row) => ({
        vehicleId: row.vehicleId,
        registrationNumber: row.vehicleId
          ? vehicleById.get(row.vehicleId)?.registrationNumber ?? 'Deleted vehicle'
          : 'No vehicle recorded',
        totalLiters: round2(Number(row._sum.quantityLiters || 0)),
        totalValue: round2(Number(row._sum.amount || 0)),
        transactionCount: row._count._all,
      }))
      .sort((a, b) => b.totalLiters - a.totalLiters);

    return {
      stockId: stock.id,
      currentQuantityLiters: Number(stock.currentQuantityLiters),
      currentValue: Number(stock.currentValue),
      averageRatePerLiter: averageRate(stock),
      purchased: byType.PURCHASE,
      issued: byType.ISSUE,
      returned: byType.RETURN,
      adjusted: byType.ADJUSTMENT,
      vehicleUsage,
    };
  },

  /**
   * Buying AdBlue into the store: the money leaves the chosen Bank/Cash
   * account and comes back as litres on the shelf. No truck is named on
   * purpose — the drums go to the yard, and whichever truck needs them
   * draws them later through an AdBlue entry.
   */
  async purchase(input: PurchaseAdBlueStockInput, actorId: string) {
    const stock = await adBlueStockRepository.getOrCreateStock(actorId);

    if (input.supplierId) {
      const supplier = await adBlueStockRepository.findSupplierById(input.supplierId);
      if (!supplier) throw new AppError('Supplier not found', 404);
    }

    // The validator guarantees one of these two is present; whichever it is
    // decides the other, and the money paid wins when both are given.
    const amount = input.amount != null ? input.amount : round2(input.quantityLiters * (input.ratePerLiter as number));
    const ratePerLiter = round2(amount / input.quantityLiters);

    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const fundAccount = await resolveOrDefaultFundAccount(organizationId, input.fundAccountType, input.fundAccountId);
    if (!fundAccount.isActive) throw new AppError('The selected Bank/Cash account is inactive', 409);

    await adjustFundAccountBalance(fundAccount.type, fundAccount.id, -amount);

    const transaction = await adBlueStockRepository.createTransaction({
      stockId: stock.id,
      type: 'PURCHASE',
      quantityLiters: input.quantityLiters,
      ratePerLiter,
      amount,
      supplierId: input.supplierId,
      transactionDate: input.transactionDate ? new Date(input.transactionDate) : new Date(),
      invoiceNumber: input.invoiceNumber,
      referenceNumber: input.referenceNumber,
      remarks: input.remarks,
      fundAccountType: fundAccount.type,
      fundAccountId: fundAccount.id,
      createdById: actorId,
      updatedById: actorId,
    });
    await adBlueStockRepository.adjustStock(stock.id, input.quantityLiters, amount);

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'AdBlueStockTransaction',
      entityId: transaction.id,
      description: `Purchased ${input.quantityLiters} L of AdBlue for ${amount} from ${fundAccount.label}`,
    });
    return adBlueStockService.getStock(actorId);
  },

  /**
   * Stock sent back to the supplier — litres leave the store and the money
   * comes back to the Bank/Cash account. Valued at the store's own average
   * rate rather than at whatever the newest drum cost, so what is left
   * behind keeps costing what it actually cost.
   */
  async returnToSupplier(input: ReturnAdBlueStockInput, actorId: string) {
    const stock = await adBlueStockRepository.getOrCreateStock(actorId);
    assertEnoughStock(stock, input.quantityLiters);

    if (input.supplierId) {
      const supplier = await adBlueStockRepository.findSupplierById(input.supplierId);
      if (!supplier) throw new AppError('Supplier not found', 404);
    }

    const rate = averageRate(stock);
    if (rate == null) throw new AppError('The AdBlue store is empty — there is nothing to return', 409);
    const amount = round2(input.quantityLiters * rate);

    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const fundAccount = await resolveOrDefaultFundAccount(organizationId, input.fundAccountType, input.fundAccountId);
    if (!fundAccount.isActive) throw new AppError('The selected Bank/Cash account is inactive', 409);

    await adjustFundAccountBalance(fundAccount.type, fundAccount.id, amount);

    const transaction = await adBlueStockRepository.createTransaction({
      stockId: stock.id,
      type: 'RETURN',
      quantityLiters: input.quantityLiters,
      ratePerLiter: rate,
      amount,
      supplierId: input.supplierId,
      transactionDate: input.transactionDate ? new Date(input.transactionDate) : new Date(),
      referenceNumber: input.referenceNumber,
      remarks: input.remarks,
      fundAccountType: fundAccount.type,
      fundAccountId: fundAccount.id,
      createdById: actorId,
      updatedById: actorId,
    });
    await adBlueStockRepository.adjustStock(stock.id, -input.quantityLiters, -amount);

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'AdBlueStockTransaction',
      entityId: transaction.id,
      description: `Returned ${input.quantityLiters} L of AdBlue to the supplier for ${amount}`,
    });
    return adBlueStockService.getStock(actorId);
  },

  /**
   * Lining the book stock up with a physical count — spillage, evaporation,
   * a mis-measured drum. Stored pre-signed (quantity and amount can both be
   * negative) so edit and delete can reverse it unambiguously later.
   *
   * Valued at the store's average rate unless a rate is given, which is
   * what an INCREASE into an empty store needs.
   */
  async adjust(input: AdjustAdBlueStockInput, actorId: string) {
    const stock = await adBlueStockRepository.getOrCreateStock(actorId);
    if (input.direction === 'DECREASE') assertEnoughStock(stock, input.quantityLiters);

    const rate = input.ratePerLiter ?? averageRate(stock);
    if (rate == null) {
      throw new AppError(
        'The AdBlue store is empty, so there is no rate to value this adjustment at — enter a rate per litre',
        422
      );
    }

    const sign = input.direction === 'DECREASE' ? -1 : 1;
    const signedQuantity = sign * input.quantityLiters;
    const signedAmount = round2(sign * input.quantityLiters * rate);

    const transaction = await adBlueStockRepository.createTransaction({
      stockId: stock.id,
      type: 'ADJUSTMENT',
      quantityLiters: signedQuantity,
      ratePerLiter: rate,
      amount: signedAmount,
      transactionDate: input.transactionDate ? new Date(input.transactionDate) : new Date(),
      remarks: input.remarks,
      createdById: actorId,
      updatedById: actorId,
    });
    await adBlueStockRepository.adjustStock(stock.id, signedQuantity, signedAmount);

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'AdBlueStockTransaction',
      entityId: transaction.id,
      description: `Adjusted the AdBlue store by ${signedQuantity} L (${signedAmount}): ${input.remarks}`,
    });
    return adBlueStockService.getStock(actorId);
  },

  /**
   * Edits a hand-entered movement. Reverses its old effect on the store
   * (and, for a PURCHASE or RETURN, on whichever Bank/Cash account it
   * originally moved money through) and re-applies the new one, so nothing
   * drifts.
   */
  async updateTransaction(transactionId: string, input: UpdateAdBlueStockTransactionInput, actorId: string) {
    const existing = await adBlueStockRepository.findTransactionById(transactionId);
    if (!existing) throw new AppError('AdBlue stock transaction not found', 404);
    assertManualType(existing.type);

    if (input.supplierId) {
      const supplier = await adBlueStockRepository.findSupplierById(input.supplierId);
      if (!supplier) throw new AppError('Supplier not found', 404);
    }

    const oldQuantity = Number(existing.quantityLiters);
    const oldAmount = Number(existing.amount);
    const oldRate = existing.ratePerLiter == null ? null : Number(existing.ratePerLiter);

    // An ADJUSTMENT is stored pre-signed, so a new quantity keeps the
    // direction the row was created with rather than flipping it silently.
    const signedQuantity =
      input.quantityLiters === undefined
        ? oldQuantity
        : existing.type === 'ADJUSTMENT' && oldQuantity < 0
          ? -input.quantityLiters
          : input.quantityLiters;

    // Whichever of rate/amount the caller sent decides the other, the same
    // way a purchase resolves them on the way in.
    const rate = input.ratePerLiter ?? oldRate;
    let signedAmount: number;
    if (input.amount !== undefined) {
      signedAmount = signedQuantity < 0 ? -input.amount : input.amount;
    } else if (rate != null) {
      signedAmount = round2(signedQuantity * rate);
    } else {
      signedAmount = oldAmount;
    }

    const oldDelta = stockDelta(existing.type, oldQuantity, oldAmount);
    const newDelta = stockDelta(existing.type, signedQuantity, signedAmount);

    const stock = await adBlueStockRepository.getOrCreateStock(actorId);
    // The store has to survive the edit: put the old movement back, then
    // check the new one still fits what is on the shelf.
    const quantityAfter = Number(stock.currentQuantityLiters) - oldDelta.quantity + newDelta.quantity;
    if (quantityAfter < 0) {
      throw new AppError(
        `That change would leave the AdBlue store at ${quantityAfter.toFixed(2)} L. Record the missing litres as a purchase or an adjustment first.`,
        409
      );
    }

    let fundAccountType = existing.fundAccountType;
    let fundAccountId = existing.fundAccountId;
    if (existing.type === 'PURCHASE' || existing.type === 'RETURN') {
      // A purchase took money out of a Bank/Cash account and a return put it
      // back, so reversing and re-applying follow that same sign.
      const moneySign = existing.type === 'PURCHASE' ? -1 : 1;
      const organizationId = await organizationService.resolveOrganizationId(undefined);
      if (existing.fundAccountType && existing.fundAccountId) {
        await adjustFundAccountBalance(
          existing.fundAccountType as 'BANK' | 'CASH',
          existing.fundAccountId,
          -moneySign * oldAmount
        );
      }
      const fundAccount = await resolveOrDefaultFundAccount(
        organizationId,
        (input.fundAccountType as 'BANK' | 'CASH' | undefined) ??
          (existing.fundAccountType as 'BANK' | 'CASH' | undefined),
        input.fundAccountId ?? existing.fundAccountId ?? undefined
      );
      if (!fundAccount.isActive) throw new AppError('The selected Bank/Cash account is inactive', 409);
      await adjustFundAccountBalance(fundAccount.type, fundAccount.id, moneySign * signedAmount);
      fundAccountType = fundAccount.type;
      fundAccountId = fundAccount.id;
    }

    await adBlueStockRepository.adjustStock(
      existing.stockId,
      newDelta.quantity - oldDelta.quantity,
      newDelta.value - oldDelta.value
    );

    const updated = await adBlueStockRepository.updateTransaction(transactionId, {
      quantityLiters: signedQuantity,
      ratePerLiter: rate ?? undefined,
      amount: signedAmount,
      supplierId: input.supplierId !== undefined ? input.supplierId : undefined,
      transactionDate: input.transactionDate ? new Date(input.transactionDate) : undefined,
      invoiceNumber: input.invoiceNumber !== undefined ? input.invoiceNumber : undefined,
      referenceNumber: input.referenceNumber !== undefined ? input.referenceNumber : undefined,
      remarks: input.remarks !== undefined ? input.remarks : undefined,
      fundAccountType,
      fundAccountId,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'AdBlueStockTransaction',
      entityId: transactionId,
      description: `Edited AdBlue ${existing.type.toLowerCase()} movement`,
    });
    return serializeTransaction(updated);
  },

  /**
   * Reverses the movement's effect on the store (and, for a PURCHASE or
   * RETURN, on the Bank/Cash account it moved money through) before
   * removing the row — a delete must never leave a silent stock or balance
   * discrepancy behind.
   */
  async deleteTransaction(transactionId: string, actorId: string) {
    const existing = await adBlueStockRepository.findTransactionById(transactionId);
    if (!existing) throw new AppError('AdBlue stock transaction not found', 404);
    assertManualType(existing.type);

    const quantity = Number(existing.quantityLiters);
    const amount = Number(existing.amount);
    const delta = stockDelta(existing.type, quantity, amount);

    const stock = await adBlueStockRepository.getOrCreateStock(actorId);
    const quantityAfter = Number(stock.currentQuantityLiters) - delta.quantity;
    if (quantityAfter < 0) {
      throw new AppError(
        `Deleting this movement would leave the AdBlue store at ${quantityAfter.toFixed(2)} L — those litres have already gone into trucks. Record a correcting adjustment instead.`,
        409
      );
    }

    await adBlueStockRepository.adjustStock(existing.stockId, -delta.quantity, -delta.value);

    if (
      (existing.type === 'PURCHASE' || existing.type === 'RETURN') &&
      existing.fundAccountType &&
      existing.fundAccountId
    ) {
      const moneySign = existing.type === 'PURCHASE' ? 1 : -1;
      await adjustFundAccountBalance(
        existing.fundAccountType as 'BANK' | 'CASH',
        existing.fundAccountId,
        moneySign * amount
      );
    }

    await adBlueStockRepository.deleteTransaction(transactionId);

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'AdBlueStockTransaction',
      entityId: transactionId,
      description: `Deleted AdBlue ${existing.type.toLowerCase()} movement of ${quantity} L (${amount})`,
    });
  },
};

/**
 * The ISSUE half of the store, owned by adblue-entry.service. Kept apart
 * from the routed service above because no HTTP route may create, edit or
 * delete a withdrawal directly: a stock-filled top-up and its withdrawal
 * are one fact, entered once.
 */
export const adBlueStockInternalService = {
  /**
   * What a FROM_STOCK top-up of this size costs, decided before the entry
   * is written so the entry and its withdrawal always agree.
   *
   * An edit keeps the rate its withdrawal was first valued at: the litres
   * left the shelf when they left it, and re-pricing them because the
   * average has moved since would rewrite history. Only a brand-new
   * withdrawal is valued at today's average.
   */
  async resolveIssueValuation(params: { quantityLiters: number; adBlueEntryId?: string; actorId: string }) {
    const stock = await adBlueStockRepository.getOrCreateStock(params.actorId);
    const existing = params.adBlueEntryId
      ? await adBlueStockRepository.findTransactionByEntryId(params.adBlueEntryId)
      : null;

    assertEnoughStock(stock, params.quantityLiters, existing ? Number(existing.quantityLiters) : 0);

    const rate = (existing?.ratePerLiter != null ? Number(existing.ratePerLiter) : null) ?? averageRate(stock);
    if (rate == null) {
      throw new AppError(
        'The AdBlue store is empty — record a stock purchase first, or enter this top-up as a direct purchase.',
        409
      );
    }
    return { ratePerLiter: rate, totalAmount: round2(params.quantityLiters * rate) };
  },

  /**
   * Brings the withdrawal for one AdBlue entry in line with the top-up as
   * it now stands — creating it when an entry first becomes stock-filled,
   * re-pointing and re-sizing it when either changes, and removing it when
   * the entry stops drawing on the store. Safe to call on every write.
   */
  async syncFromEntry(params: {
    adBlueEntryId: string;
    vehicleId: string;
    fromStock: boolean;
    quantityLiters: number | null;
    ratePerLiter: number | null;
    totalAmount: number | null;
    entryDate: Date;
    actorId: string;
  }) {
    const existing = await adBlueStockRepository.findTransactionByEntryId(params.adBlueEntryId);
    const shouldDraw =
      params.fromStock && params.quantityLiters != null && params.quantityLiters > 0 && params.totalAmount != null;

    if (!shouldDraw) {
      if (existing) await adBlueStockInternalService.removeFromEntry(params.adBlueEntryId, params.actorId);
      return;
    }

    const quantity = params.quantityLiters as number;
    const amount = params.totalAmount as number;

    if (!existing) {
      const stock = await adBlueStockRepository.getOrCreateStock(params.actorId);
      const transaction = await adBlueStockRepository.createTransaction({
        stockId: stock.id,
        type: 'ISSUE',
        quantityLiters: quantity,
        ratePerLiter: params.ratePerLiter,
        amount,
        vehicleId: params.vehicleId,
        adBlueEntryId: params.adBlueEntryId,
        transactionDate: params.entryDate,
        createdById: params.actorId,
        updatedById: params.actorId,
      });
      await adBlueStockRepository.adjustStock(stock.id, -quantity, -amount);
      await auditService.record({
        userId: params.actorId,
        action: 'CREATE',
        entityType: 'AdBlueStockTransaction',
        entityId: transaction.id,
        description: `AdBlue store issued ${quantity} L (${amount}) to a vehicle`,
      });
      return;
    }

    const oldQuantity = Number(existing.quantityLiters);
    const oldAmount = Number(existing.amount);
    if (oldQuantity !== quantity || oldAmount !== amount) {
      await adBlueStockRepository.adjustStock(existing.stockId, oldQuantity - quantity, oldAmount - amount);
    }
    await adBlueStockRepository.updateTransaction(existing.id, {
      quantityLiters: quantity,
      ratePerLiter: params.ratePerLiter,
      amount,
      vehicleId: params.vehicleId,
      transactionDate: params.entryDate,
      updatedById: params.actorId,
    });
  },

  /** Puts the litres and their cost back on the shelf and drops the row — used when a stock-filled entry is deleted or becomes a direct purchase. */
  async removeFromEntry(adBlueEntryId: string, actorId: string) {
    const existing = await adBlueStockRepository.findTransactionByEntryId(adBlueEntryId);
    if (!existing) return;

    await adBlueStockRepository.adjustStock(existing.stockId, Number(existing.quantityLiters), Number(existing.amount));
    await adBlueStockRepository.deleteTransaction(existing.id);
    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'AdBlueStockTransaction',
      entityId: existing.id,
      description: `AdBlue store credited back ${existing.quantityLiters} L (${existing.amount}) — its entry no longer draws from stock`,
    });
  },
};
