import { Request } from 'express';
import { TripExpenseCategory } from '@prisma/client';
import { tripExpenseRepository, TripExpenseWithTrip } from '../repositories/trip-expense.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateTripExpenseInput, UpdateTripExpenseInput } from '../validators/trip-expense.validator';

function serialize(expense: TripExpenseWithTrip) {
  return {
    id: expense.id,
    category: expense.category,
    amount: expense.amount,
    expenseDate: expense.expenseDate,
    description: expense.description,
    billDocument: expense.billDocument,
    trip: { id: expense.trip.id, tripNumber: expense.trip.tripNumber },
    source: 'manual' as const,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
  };
}

type LinkedExpenseRow = Awaited<ReturnType<typeof tripExpenseRepository.linkedExpenseRows>>[number];

/** Same shape as a manual TripExpense row, so the frontend can render both in one list — tagged `source: 'linked'` (and which module it came from) so the UI knows not to offer edit/delete here. */
function serializeLinked(row: LinkedExpenseRow) {
  return {
    id: `linked-${row.id}`,
    category: row.category === 'FUEL' ? ('FUEL' as const) : ('TOLL' as const),
    amount: row.amount,
    expenseDate: row.expenseDate,
    description: row.description,
    billDocument: null,
    trip: row.trip ? { id: row.trip.id, tripNumber: row.trip.tripNumber } : { id: row.tripId!, tripNumber: '' },
    source: 'linked' as const,
    sourceType: row.referenceType,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const tripExpenseService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const tripId = (query.tripId as string) || undefined;
    const category = (query.category as TripExpenseCategory) || undefined;
    const linkedCategory = category === 'FUEL' || category === 'TOLL' ? category : undefined;
    const includeLinked = !category || linkedCategory;

    // Manual (TripExpense) and linked (Fuel Entry/FASTag, mirrored into
    // VehicleExpense) rows live in different tables, so a single DB query
    // can't paginate the merged, date-sorted result. Both sources are
    // already sorted desc by date, so pulling the top `skip+take` rows from
    // each and merging is a valid k-way merge — it always contains the true
    // top `skip+take` of the combined set, at any page depth, without
    // capping the dataset at an arbitrary size.
    const window = skip + take;
    const [manual, linkedCount, linkedRows] = await Promise.all([
      tripExpenseRepository.findManyPaginated({ skip: 0, take: window, tripId, category }),
      includeLinked ? tripExpenseRepository.countLinkedExpenseRows({ tripId, category: linkedCategory }) : 0,
      includeLinked
        ? tripExpenseRepository.linkedExpenseRows({ tripId, category: linkedCategory, take: window })
        : Promise.resolve([]),
    ]);

    const merged = [...manual.rows.map(serialize), ...linkedRows.map(serializeLinked)].sort(
      (a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()
    );

    const total = manual.total + linkedCount;
    const paged = merged.slice(skip, skip + take);

    return { data: paged, meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const expense = await tripExpenseRepository.findById(id);
    if (!expense) {
      throw new AppError('Trip expense not found', 404);
    }
    return serialize(expense);
  },

  async create(input: CreateTripExpenseInput, actorId: string) {
    const trip = await tripExpenseRepository.findTripById(input.tripId);
    if (!trip) {
      throw new AppError('Trip not found', 404);
    }

    const expense = await tripExpenseRepository.create({
      tripId: input.tripId,
      category: input.category,
      amount: input.amount,
      expenseDate: input.expenseDate ? new Date(input.expenseDate) : new Date(),
      description: input.description,
      createdById: actorId,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'TripExpense',
      entityId: expense.id,
      description: `Recorded ${input.category} expense for trip ${trip.tripNumber}`,
    });

    return tripExpenseService.getById(expense.id);
  },

  async update(id: string, input: UpdateTripExpenseInput, actorId: string) {
    const existing = await tripExpenseRepository.findById(id);
    if (!existing) {
      throw new AppError('Trip expense not found', 404);
    }

    await tripExpenseRepository.update(id, {
      category: input.category,
      amount: input.amount,
      expenseDate: input.expenseDate ? new Date(input.expenseDate) : undefined,
      description: input.description,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'TripExpense',
      entityId: id,
      description: `Updated expense for trip ${existing.trip.tripNumber}`,
    });

    return tripExpenseService.getById(id);
  },

  async setBillDocument(id: string, filePath: string, actorId: string) {
    const existing = await tripExpenseRepository.findById(id);
    if (!existing) {
      throw new AppError('Trip expense not found', 404);
    }

    await tripExpenseRepository.setBillDocument(id, filePath, actorId);

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'TripExpense',
      entityId: id,
      description: `Uploaded bill for expense on trip ${existing.trip.tripNumber}`,
    });

    return tripExpenseService.getById(id);
  },

  async remove(id: string, actorId: string) {
    const existing = await tripExpenseRepository.findById(id);
    if (!existing) {
      throw new AppError('Trip expense not found', 404);
    }

    await tripExpenseRepository.softDelete(id, actorId);

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'TripExpense',
      entityId: id,
      description: `Deleted expense for trip ${existing.trip.tripNumber}`,
    });
  },
};
