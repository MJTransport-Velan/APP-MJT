import { Request } from 'express';
import { adminDepartmentRepository, AdminDepartmentWithCounts } from '../repositories/admin-department.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateDepartmentInput, UpdateDepartmentInput } from '../validators/admin-department.validator';

function serialize(department: AdminDepartmentWithCounts) {
  return {
    id: department.id,
    name: department.name,
    description: department.description,
    isActive: department.isActive,
    teamCount: department._count.teams,
    createdAt: department.createdAt,
    updatedAt: department.updatedAt,
  };
}

export const adminDepartmentService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const search = (query.search as string) || undefined;

    const { rows, total } = await adminDepartmentRepository.findManyPaginated({ skip, take, search });

    return {
      data: rows.map(serialize),
      meta: buildPaginationMeta(page, pageSize, total),
    };
  },

  async getById(id: string) {
    const department = await adminDepartmentRepository.findById(id);
    if (!department) {
      throw new AppError('Department not found', 404);
    }
    return serialize(department);
  },

  async create(input: CreateDepartmentInput, actorId: string) {
    const existing = await adminDepartmentRepository.findByName(input.name);
    if (existing) {
      throw new AppError('Department name already exists', 409);
    }

    const department = await adminDepartmentRepository.create(input);

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'Department',
      entityId: department.id,
      description: `Created department ${department.name}`,
    });

    return adminDepartmentService.getById(department.id);
  },

  async update(id: string, input: UpdateDepartmentInput, actorId: string) {
    const existing = await adminDepartmentRepository.findById(id);
    if (!existing) {
      throw new AppError('Department not found', 404);
    }

    if (input.name && input.name !== existing.name) {
      const nameTaken = await adminDepartmentRepository.findByName(input.name);
      if (nameTaken) {
        throw new AppError('Department name already exists', 409);
      }
    }

    await adminDepartmentRepository.update(id, input);

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Department',
      entityId: id,
      description: `Updated department ${existing.name}`,
    });

    return adminDepartmentService.getById(id);
  },

  async remove(id: string, actorId: string) {
    const existing = await adminDepartmentRepository.findById(id);
    if (!existing) {
      throw new AppError('Department not found', 404);
    }

    const teamCount = await adminDepartmentRepository.countTeams(id);
    if (teamCount > 0) {
      throw new AppError(
        `Cannot delete department "${existing.name}" — it still has ${teamCount} team(s). Reassign or delete them first.`,
        409
      );
    }

    await adminDepartmentRepository.delete(id);

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'Department',
      entityId: id,
      description: `Deleted department ${existing.name}`,
    });
  },
};
