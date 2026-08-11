import { Prisma, FastTagTransactionType, FastTagTransactionStatus } from '@prisma/client';
import { prisma } from '../config/db';

const transactionWithRelations = Prisma.validator<Prisma.FastTagTransactionInclude>()({
  trip: { select: { id: true, tripNumber: true } },
  vehicle: { select: { id: true, registrationNumber: true } },
});

export type FastTagAccountRow = Prisma.FastTagAccountGetPayload<object>;
export type FastTagTransactionWithRelations = Prisma.FastTagTransactionGetPayload<{ include: typeof transactionWithRelations }>;

export const fastTagRepository = {
  /** There is exactly one live wallet for the whole fleet — lazily created on first use. */
  async getOrCreateWallet(actorId: string): Promise<FastTagAccountRow> {
    const existing = await prisma.fastTagAccount.findFirst({ where: { deletedAt: null } });
    if (existing) return existing;
    return prisma.fastTagAccount.create({ data: { createdById: actorId, updatedById: actorId } });
  },

  findWallet() {
    return prisma.fastTagAccount.findFirst({ where: { deletedAt: null } });
  },

  updateWallet(id: string, data: Prisma.FastTagAccountUncheckedUpdateInput) {
    return prisma.fastTagAccount.update({ where: { id }, data });
  },

  findVehicleById(id: string) {
    return prisma.vehicle.findFirst({ where: { id, deletedAt: null } });
  },

  /** The trip that was actually running for this vehicle at a given moment — actualStartDate <= at <= (actualEndDate ?? now). Used to auto-attach an imported toll charge to "the respective trip". */
  findActiveTripForVehicleAt(vehicleId: string, at: Date) {
    return prisma.trip.findFirst({
      where: {
        vehicleId,
        deletedAt: null,
        actualStartDate: { not: null, lte: at },
        OR: [{ actualEndDate: null }, { actualEndDate: { gte: at } }],
      },
      orderBy: { actualStartDate: 'desc' },
      select: { id: true, tripNumber: true },
    });
  },

  findVehicleByRegistrationNumber(registrationNumber: string) {
    return prisma.vehicle.findFirst({ where: { registrationNumber, deletedAt: null } });
  },

  adjustBalance(id: string, delta: Prisma.Decimal.Value) {
    return prisma.fastTagAccount.update({ where: { id }, data: { currentBalance: { increment: delta } } });
  },

  createTransaction(data: Prisma.FastTagTransactionUncheckedCreateInput) {
    return prisma.fastTagTransaction.create({ data, include: transactionWithRelations });
  },

  findTransactionById(id: string) {
    return prisma.fastTagTransaction.findUnique({ where: { id }, include: transactionWithRelations });
  },

  updateTransaction(id: string, data: Prisma.FastTagTransactionUncheckedUpdateInput) {
    return prisma.fastTagTransaction.update({ where: { id }, data, include: transactionWithRelations });
  },

  deleteTransaction(id: string) {
    return prisma.fastTagTransaction.delete({ where: { id } });
  },

  findTransactionsPaginated(params: {
    skip: number;
    take: number;
    vehicleId?: string;
    tripId?: string;
    type?: FastTagTransactionType;
    status?: FastTagTransactionStatus;
    from?: Date;
    to?: Date;
  }) {
    const where: Prisma.FastTagTransactionWhereInput = {
      AND: [
        params.vehicleId ? { vehicleId: params.vehicleId } : {},
        params.tripId ? { tripId: params.tripId } : {},
        params.type ? { type: params.type } : {},
        params.status ? { status: params.status } : {},
        params.from || params.to
          ? { transactionDate: { ...(params.from ? { gte: params.from } : {}), ...(params.to ? { lte: params.to } : {}) } }
          : {},
      ],
    };
    return prisma.$transaction([
      prisma.fastTagTransaction.findMany({ where, include: transactionWithRelations, orderBy: { transactionDate: 'desc' }, skip: params.skip, take: params.take }),
      prisma.fastTagTransaction.count({ where }),
    ]).then(([rows, total]) => ({ rows, total }));
  },

  /** Same duplicate-detection shape import.service.ts relies on: exact reference match, or same vehicle+datetime+amount. */
  findDuplicateTransaction(params: { transactionReference?: string; vehicleId?: string; transactionDate?: Date; amount?: number }) {
    if (params.transactionReference) {
      return prisma.fastTagTransaction.findFirst({ where: { transactionReference: params.transactionReference } });
    }
    if (params.vehicleId && params.transactionDate && params.amount !== undefined) {
      return prisma.fastTagTransaction.findFirst({
        where: { vehicleId: params.vehicleId, transactionDate: params.transactionDate, amount: params.amount },
      });
    }
    return Promise.resolve(null);
  },

  walletTotals(accountId: string) {
    return prisma.fastTagTransaction.groupBy({
      by: ['type'],
      where: { accountId },
      _sum: { amount: true },
    });
  },
};
