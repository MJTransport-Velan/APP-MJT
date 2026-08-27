import { Prisma, FuelCardTransactionType } from '@prisma/client';
import { prisma } from '../config/db';

const transactionWithRelations = Prisma.validator<Prisma.FuelCardTransactionInclude>()({
  fuelCard: { select: { id: true, cardNumber: true } },
  vehicle: { select: { id: true, registrationNumber: true } },
  fuelEntry: { select: { id: true, entryDate: true, quantityLiters: true, location: true } },
});

export type FuelCardAccountRow = Prisma.FuelCardAccountGetPayload<object>;
export type FuelCardTransactionWithRelations = Prisma.FuelCardTransactionGetPayload<{ include: typeof transactionWithRelations }>;

export const fuelCardAccountRepository = {
  /** There is exactly one live diesel-card account for the whole fleet — lazily created on first use. */
  async getOrCreateAccount(actorId: string): Promise<FuelCardAccountRow> {
    const existing = await prisma.fuelCardAccount.findFirst({ where: { deletedAt: null } });
    if (existing) return existing;
    return prisma.fuelCardAccount.create({ data: { createdById: actorId, updatedById: actorId } });
  },

  findAccount() {
    return prisma.fuelCardAccount.findFirst({ where: { deletedAt: null } });
  },

  updateAccount(id: string, data: Prisma.FuelCardAccountUncheckedUpdateInput) {
    return prisma.fuelCardAccount.update({ where: { id }, data });
  },

  adjustBalance(id: string, delta: Prisma.Decimal.Value) {
    return prisma.fuelCardAccount.update({ where: { id }, data: { currentBalance: { increment: delta } } });
  },

  findCardById(id: string) {
    return prisma.fuelCard.findFirst({ where: { id, deletedAt: null } });
  },

  findVehicleById(id: string) {
    return prisma.vehicle.findFirst({ where: { id, deletedAt: null } });
  },

  createTransaction(data: Prisma.FuelCardTransactionUncheckedCreateInput) {
    return prisma.fuelCardTransaction.create({ data, include: transactionWithRelations });
  },

  findTransactionById(id: string) {
    return prisma.fuelCardTransaction.findUnique({ where: { id }, include: transactionWithRelations });
  },

  /** The drawdown a card-billed fuel entry owns, if it has one. */
  findTransactionByFuelEntryId(fuelEntryId: string) {
    return prisma.fuelCardTransaction.findUnique({ where: { fuelEntryId } });
  },

  updateTransaction(id: string, data: Prisma.FuelCardTransactionUncheckedUpdateInput) {
    return prisma.fuelCardTransaction.update({ where: { id }, data, include: transactionWithRelations });
  },

  deleteTransaction(id: string) {
    return prisma.fuelCardTransaction.delete({ where: { id } });
  },

  findTransactionsPaginated(params: {
    skip: number;
    take: number;
    fuelCardId?: string;
    vehicleId?: string;
    type?: FuelCardTransactionType;
    from?: Date;
    to?: Date;
  }) {
    const where: Prisma.FuelCardTransactionWhereInput = {
      AND: [
        params.fuelCardId ? { fuelCardId: params.fuelCardId } : {},
        params.vehicleId ? { vehicleId: params.vehicleId } : {},
        params.type ? { type: params.type } : {},
        params.from || params.to
          ? { transactionDate: { ...(params.from ? { gte: params.from } : {}), ...(params.to ? { lte: params.to } : {}) } }
          : {},
      ],
    };
    return prisma
      .$transaction([
        prisma.fuelCardTransaction.findMany({
          where,
          include: transactionWithRelations,
          orderBy: { transactionDate: 'desc' },
          skip: params.skip,
          take: params.take,
        }),
        prisma.fuelCardTransaction.count({ where }),
      ])
      .then(([rows, total]) => ({ rows, total }));
  },

  accountTotals(accountId: string) {
    return prisma.fuelCardTransaction.groupBy({
      by: ['type'],
      where: { accountId },
      _sum: { amount: true },
    });
  },

  /**
   * Card-wise drawdown. The balance is shared, so this is not a per-card
   * balance — it is only how much of the one balance each card has spent.
   */
  usageByCard(accountId: string) {
    return prisma.fuelCardTransaction.groupBy({
      by: ['fuelCardId'],
      where: { accountId, type: 'USAGE' },
      _sum: { amount: true },
      _count: { _all: true },
    });
  },

  findCardsByIds(ids: string[]) {
    return prisma.fuelCard.findMany({ where: { id: { in: ids } }, select: { id: true, cardNumber: true, issuedTo: true } });
  },
};
