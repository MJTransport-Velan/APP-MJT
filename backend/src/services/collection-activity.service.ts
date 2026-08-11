import { Request } from 'express';
import { collectionActivityRepository } from '../repositories/collection-activity.repository';
import { auditService } from './audit.service';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateCollectionActivityInput } from '../validators/collection-activity.validator';

export const collectionActivityService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const { rows, total } = await collectionActivityRepository.findManyPaginated({
      skip,
      take,
      companyId: (query.companyId as string) || undefined,
      invoiceId: (query.invoiceId as string) || undefined,
    });
    return { data: rows, meta: buildPaginationMeta(page, pageSize, total) };
  },

  async upcomingFollowUps(days = 3) {
    return collectionActivityRepository.upcomingFollowUps(days);
  },

  async create(input: CreateCollectionActivityInput, actorId: string) {
    const activity = await collectionActivityRepository.create({
      companyId: input.companyId,
      invoiceId: input.invoiceId,
      activityType: input.activityType,
      notes: input.notes,
      promisedAmount: input.promisedAmount,
      promisedDate: input.promisedDate ? new Date(input.promisedDate) : undefined,
      followUpDate: input.followUpDate ? new Date(input.followUpDate) : undefined,
      createdById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'CollectionActivity',
      entityId: activity.id,
      description: `Logged ${activity.activityType} for company ${input.companyId}`,
    });

    return activity;
  },
};
