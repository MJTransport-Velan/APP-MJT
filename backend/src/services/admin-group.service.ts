import { Request } from 'express';
import {
  adminGroupRepository,
  AdminGroupWithRelations,
  AdminGroupWithDetail,
} from '../repositories/admin-group.repository';
import { adminCompanyRepository } from '../repositories/admin-company.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import {
  CreateGroupInput,
  UpdateGroupInput,
  AssignGroupMembersInput,
  AssignGroupCompaniesInput,
} from '../validators/admin-group.validator';

function serialize(group: AdminGroupWithRelations) {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    isActive: group.isActive,
    companyCount: group._count.companies,
    memberCount: group._count.members,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}

function serializeDetail(group: AdminGroupWithDetail) {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    isActive: group.isActive,
    companies: group.companies.map((c) => ({ id: c.id, name: c.name, code: c.code })),
    members: group.members.map((m) => ({
      id: m.user.id,
      username: m.user.username,
      fullName: m.user.fullName,
      roles: m.user.userRoles.map((ur) => ur.role.name),
    })),
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}

export const adminGroupService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const search = (query.search as string) || undefined;

    const { rows, total } = await adminGroupRepository.findManyPaginated({ skip, take, search });

    return {
      data: rows.map(serialize),
      meta: buildPaginationMeta(page, pageSize, total),
    };
  },

  async getById(id: string) {
    const group = await adminGroupRepository.findById(id);
    if (!group) {
      throw new AppError('Group not found', 404);
    }
    return serializeDetail(group);
  },

  async create(input: CreateGroupInput, actorId: string) {
    const nameTaken = await adminGroupRepository.findByName(input.name);
    if (nameTaken) {
      throw new AppError('Group name already exists', 409);
    }

    const group = await adminGroupRepository.create(input);

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'Group',
      entityId: group.id,
      description: `Created group ${group.name}`,
    });

    return adminGroupService.getById(group.id);
  },

  async update(id: string, input: UpdateGroupInput, actorId: string) {
    const existing = await adminGroupRepository.findById(id);
    if (!existing) {
      throw new AppError('Group not found', 404);
    }

    if (input.name && input.name !== existing.name) {
      const nameTaken = await adminGroupRepository.findByName(input.name);
      if (nameTaken) {
        throw new AppError('Group name already exists', 409);
      }
    }

    await adminGroupRepository.update(id, input);

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Group',
      entityId: id,
      description: `Updated group ${existing.name}`,
    });

    return adminGroupService.getById(id);
  },

  async remove(id: string, actorId: string) {
    const existing = await adminGroupRepository.findById(id);
    if (!existing) {
      throw new AppError('Group not found', 404);
    }

    const companyCount = await adminGroupRepository.countCompanies(id);
    if (companyCount > 0) {
      throw new AppError(
        `Cannot delete group "${existing.name}" — it still has ${companyCount} compan${companyCount === 1 ? 'y' : 'ies'} assigned. Move them first.`,
        409
      );
    }

    const memberCount = await adminGroupRepository.countMembers(id);
    if (memberCount > 0) {
      throw new AppError(
        `Cannot delete group "${existing.name}" — it still has ${memberCount} member(s). Reassign them first.`,
        409
      );
    }

    await adminGroupRepository.delete(id);

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'Group',
      entityId: id,
      description: `Deleted group ${existing.name}`,
    });
  },

  async setMembers(id: string, input: AssignGroupMembersInput, actorId: string) {
    const existing = await adminGroupRepository.findById(id);
    if (!existing) {
      throw new AppError('Group not found', 404);
    }

    for (const userId of input.userIds) {
      const user = await adminGroupRepository.findUserById(userId);
      if (!user) {
        throw new AppError(`User ${userId} not found`, 404);
      }
    }

    await adminGroupRepository.upsertMembers(id, input.userIds);

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Group',
      entityId: id,
      description: `Updated members for group ${existing.name}`,
    });

    return adminGroupService.getById(id);
  },

  async removeMember(id: string, userId: string, actorId: string) {
    const existing = await adminGroupRepository.findById(id);
    if (!existing) {
      throw new AppError('Group not found', 404);
    }

    await adminGroupRepository.removeMember(id, userId);

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Group',
      entityId: id,
      description: `Removed a member from group ${existing.name}`,
    });

    return adminGroupService.getById(id);
  },

  async setCompanies(id: string, input: AssignGroupCompaniesInput, actorId: string) {
    const existing = await adminGroupRepository.findById(id);
    if (!existing) {
      throw new AppError('Group not found', 404);
    }

    for (const companyId of input.companyIds) {
      const company = await adminCompanyRepository.findById(companyId);
      if (!company) {
        throw new AppError(`Company ${companyId} not found`, 404);
      }
    }

    await adminGroupRepository.moveCompaniesToGroup(id, input.companyIds);

    await auditService.record({
      userId: actorId,
      action: 'GROUP_REASSIGNMENT',
      entityType: 'Group',
      entityId: id,
      description: `Moved ${input.companyIds.length} compan${input.companyIds.length === 1 ? 'y' : 'ies'} into group ${existing.name}`,
    });

    return adminGroupService.getById(id);
  },
};
