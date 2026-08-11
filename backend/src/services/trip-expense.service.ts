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
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
  };
}

export const tripExpenseService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const tripId = (query.tripId as string) || undefined;
    const category = (query.category as TripExpenseCategory) || undefined;

    const { rows, total } = await tripExpenseRepository.findManyPaginated({ skip, take, tripId, category });
    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
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
