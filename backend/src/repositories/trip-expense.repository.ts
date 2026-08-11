import { Prisma, TripExpenseCategory } from '@prisma/client';
import { prisma } from '../config/db';

const expenseWithTrip = Prisma.validator<Prisma.TripExpenseInclude>()({ trip: true });
export type TripExpenseWithTrip = Prisma.TripExpenseGetPayload<{ include: typeof expenseWithTrip }>;

export const tripExpenseRepository = {
  async findManyPaginated(params: { skip: number; take: number; tripId?: string; category?: TripExpenseCategory }) {
    const where: Prisma.TripExpenseWhereInput = {
      deletedAt: null,
      AND: [params.tripId ? { tripId: params.tripId } : {}, params.category ? { category: params.category } : {}],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.tripExpense.findMany({
        where,
        include: expenseWithTrip,
        orderBy: { expenseDate: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.tripExpense.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.tripExpense.findFirst({ where: { id, deletedAt: null }, include: expenseWithTrip });
  },

  findTripById(id: string) {
    return prisma.trip.findFirst({ where: { id, deletedAt: null } });
  },

  create(data: {
    tripId: string;
    category: TripExpenseCategory;
    amount: number;
    expenseDate: Date;
    description?: string;
    createdById: string;
    updatedById: string;
  }) {
    return prisma.tripExpense.create({ data });
  },

  update(
    id: string,
    data: Partial<{
      category: TripExpenseCategory;
      amount: number;
      expenseDate: Date;
      description: string;
      updatedById: string;
    }>
  ) {
    return prisma.tripExpense.update({ where: { id }, data });
  },

  setBillDocument(id: string, billDocument: string, updatedById: string) {
    return prisma.tripExpense.update({ where: { id }, data: { billDocument, updatedById } });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.tripExpense.update({ where: { id }, data: { deletedAt: new Date(), updatedById } });
  },
};
