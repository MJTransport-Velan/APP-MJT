import { Request } from 'express';
import { organizationRepository } from '../repositories/organization.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateOrganizationInput, UpdateOrganizationInput } from '../validators/organization.validator';

interface OrganizationRecord {
  id: string;
  code: string;
  name: string;
  gstNumber: string | null;
  panNumber: string | null;
  tanNumber: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function serialize(org: OrganizationRecord) {
  return {
    id: org.id,
    code: org.code,
    name: org.name,
    gstNumber: org.gstNumber,
    panNumber: org.panNumber,
    tanNumber: org.tanNumber,
    address: org.address,
    isActive: org.isActive,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
  };
}

export const organizationService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const search = (query.search as string) || undefined;
    const isActive = query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined;

    const { rows, total } = await organizationRepository.findManyPaginated({ skip, take, search, isActive });
    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const org = await organizationRepository.findById(id);
    if (!org) {
      throw new AppError('Organization not found', 404);
    }
    return serialize(org);
  },

  /**
   * Resolves which Organization a request is operating against. Every
   * accounting-foundation create endpoint accepts an optional
   * `organizationId` in the body so the API is already multi-company-ready;
   * when omitted (today's only real case — one Organization exists), this
   * falls back to the single active Organization rather than forcing every
   * caller to know and pass an id that, in practice, never varies yet.
   */
  async resolveOrganizationId(explicitId?: string | null): Promise<string> {
    if (explicitId) {
      const org = await organizationRepository.findById(explicitId);
      if (!org) {
        throw new AppError('Organization not found', 404);
      }
      if (!org.isActive) {
        throw new AppError('Organization is inactive', 409);
      }
      return org.id;
    }

    const defaultOrg = await organizationRepository.findFirstActive();
    if (!defaultOrg) {
      throw new AppError(
        'No active Organization exists yet. Create one before configuring the Chart of Accounts.',
        409
      );
    }
    return defaultOrg.id;
  },

  async create(input: CreateOrganizationInput, actorId: string) {
    const codeTaken = await organizationRepository.findByCode(input.code);
    if (codeTaken) {
      throw new AppError('Organization code already exists', 409);
    }

    const org = await organizationRepository.create({ ...input, createdById: actorId, updatedById: actorId });

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'Organization',
      entityId: org.id,
      description: `Created organization ${org.name}`,
    });

    return serialize(org);
  },

  async update(id: string, input: UpdateOrganizationInput, actorId: string) {
    const existing = await organizationRepository.findById(id);
    if (!existing) {
      throw new AppError('Organization not found', 404);
    }

    const updated = await organizationRepository.update(id, { ...input, updatedById: actorId });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Organization',
      entityId: id,
      description: `Updated organization ${existing.name}`,
    });

    return serialize(updated);
  },

  async toggleStatus(id: string, actorId: string) {
    const existing = await organizationRepository.findById(id);
    if (!existing) {
      throw new AppError('Organization not found', 404);
    }

    const updated = await organizationRepository.toggleStatus(id, !existing.isActive, actorId);

    await auditService.record({
      userId: actorId,
      action: updated.isActive ? 'ACTIVATE' : 'DEACTIVATE',
      entityType: 'Organization',
      entityId: id,
      description: `${updated.isActive ? 'Activated' : 'Deactivated'} organization ${existing.name}`,
    });

    return serialize(updated);
  },
};
