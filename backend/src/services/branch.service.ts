import { Request } from 'express';
import { branchRepository } from '../repositories/branch.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateBranchInput, UpdateBranchInput } from '../validators/branch.validator';

interface BranchRecord {
  id: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  company?: { id: string; name: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

function serialize(branch: BranchRecord) {
  return {
    id: branch.id,
    name: branch.name,
    code: branch.code,
    address: branch.address,
    phone: branch.phone,
    email: branch.email,
    isActive: branch.isActive,
    company: branch.company ? { id: branch.company.id, name: branch.company.name } : null,
    createdAt: branch.createdAt,
    updatedAt: branch.updatedAt,
  };
}

export const branchService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const search = (query.search as string) || undefined;
    const companyId = (query.companyId as string) || undefined;
    const isActive = query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined;

    const { rows, total } = await branchRepository.findManyPaginated({ skip, take, search, companyId, isActive });
    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const branch = await branchRepository.findById(id);
    if (!branch) {
      throw new AppError('Branch not found', 404);
    }
    return serialize(branch);
  },

  async create(input: CreateBranchInput, actorId: string) {
    const company = await branchRepository.findCompanyById(input.companyId);
    if (!company) {
      throw new AppError('Company not found', 404);
    }

    const codeTaken = await branchRepository.findByCode(input.code);
    if (codeTaken) {
      throw new AppError('Branch code already exists', 409);
    }

    const branch = await branchRepository.create({ ...input, createdById: actorId, updatedById: actorId });

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'Branch',
      entityId: branch.id,
      description: `Created branch ${branch.name}`,
    });

    return branchService.getById(branch.id);
  },

  async update(id: string, input: UpdateBranchInput, actorId: string) {
    const existing = await branchRepository.findById(id);
    if (!existing) {
      throw new AppError('Branch not found', 404);
    }

    if (input.code && input.code !== existing.code) {
      const codeTaken = await branchRepository.findByCode(input.code);
      if (codeTaken) {
        throw new AppError('Branch code already exists', 409);
      }
    }

    await branchRepository.update(id, { ...input, updatedById: actorId });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Branch',
      entityId: id,
      description: `Updated branch ${existing.name}`,
    });

    return branchService.getById(id);
  },

  async toggleStatus(id: string, actorId: string) {
    const existing = await branchRepository.findById(id);
    if (!existing) {
      throw new AppError('Branch not found', 404);
    }

    const updated = await branchRepository.toggleStatus(id, !existing.isActive, actorId);

    await auditService.record({
      userId: actorId,
      action: updated.isActive ? 'ACTIVATE' : 'DEACTIVATE',
      entityType: 'Branch',
      entityId: id,
      description: `${updated.isActive ? 'Activated' : 'Deactivated'} branch ${existing.name}`,
    });

    return branchService.getById(id);
  },

  async remove(id: string, actorId: string) {
    const existing = await branchRepository.findById(id);
    if (!existing) {
      throw new AppError('Branch not found', 404);
    }

    await branchRepository.softDelete(id, actorId);

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'Branch',
      entityId: id,
      description: `Deleted branch ${existing.name}`,
    });
  },
};
