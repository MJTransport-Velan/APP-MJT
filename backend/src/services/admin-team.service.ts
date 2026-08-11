import { Request } from 'express';
import {
  adminTeamRepository,
  AdminTeamWithRelations,
  AdminTeamWithMembers,
} from '../repositories/admin-team.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateTeamInput, UpdateTeamInput, AssignTeamMembersInput } from '../validators/admin-team.validator';

function serialize(team: AdminTeamWithRelations) {
  return {
    id: team.id,
    name: team.name,
    description: team.description,
    isActive: team.isActive,
    department: { id: team.department.id, name: team.department.name },
    memberCount: team._count.userTeams,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  };
}

function serializeWithMembers(team: AdminTeamWithMembers) {
  return {
    id: team.id,
    name: team.name,
    description: team.description,
    isActive: team.isActive,
    department: { id: team.department.id, name: team.department.name },
    members: team.userTeams.map((ut) => ({
      id: ut.user.id,
      username: ut.user.username,
      fullName: ut.user.fullName,
    })),
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  };
}

export const adminTeamService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const search = (query.search as string) || undefined;
    const departmentId = (query.departmentId as string) || undefined;

    const { rows, total } = await adminTeamRepository.findManyPaginated({ skip, take, search, departmentId });

    return {
      data: rows.map(serialize),
      meta: buildPaginationMeta(page, pageSize, total),
    };
  },

  async getById(id: string) {
    const team = await adminTeamRepository.findById(id);
    if (!team) {
      throw new AppError('Team not found', 404);
    }
    return serializeWithMembers(team);
  },

  async create(input: CreateTeamInput, actorId: string) {
    const nameTaken = await adminTeamRepository.findByName(input.name);
    if (nameTaken) {
      throw new AppError('Team name already exists', 409);
    }

    const department = await adminTeamRepository.findDepartmentById(input.departmentId);
    if (!department) {
      throw new AppError('Department not found', 404);
    }

    const team = await adminTeamRepository.create(input);

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'Team',
      entityId: team.id,
      description: `Created team ${team.name}`,
    });

    return adminTeamService.getById(team.id);
  },

  async update(id: string, input: UpdateTeamInput, actorId: string) {
    const existing = await adminTeamRepository.findById(id);
    if (!existing) {
      throw new AppError('Team not found', 404);
    }

    if (input.name && input.name !== existing.name) {
      const nameTaken = await adminTeamRepository.findByName(input.name);
      if (nameTaken) {
        throw new AppError('Team name already exists', 409);
      }
    }

    if (input.departmentId) {
      const department = await adminTeamRepository.findDepartmentById(input.departmentId);
      if (!department) {
        throw new AppError('Department not found', 404);
      }
    }

    await adminTeamRepository.update(id, input);

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Team',
      entityId: id,
      description: `Updated team ${existing.name}`,
    });

    return adminTeamService.getById(id);
  },

  async remove(id: string, actorId: string) {
    const existing = await adminTeamRepository.findById(id);
    if (!existing) {
      throw new AppError('Team not found', 404);
    }

    const memberCount = await adminTeamRepository.countMembers(id);
    if (memberCount > 0) {
      throw new AppError(
        `Cannot delete team "${existing.name}" — it still has ${memberCount} member(s). Reassign them first.`,
        409
      );
    }

    await adminTeamRepository.delete(id);

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'Team',
      entityId: id,
      description: `Deleted team ${existing.name}`,
    });
  },

  async assignMembers(id: string, input: AssignTeamMembersInput, actorId: string) {
    const existing = await adminTeamRepository.findById(id);
    if (!existing) {
      throw new AppError('Team not found', 404);
    }

    await adminTeamRepository.setMembers(id, input.userIds);

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Team',
      entityId: id,
      description: `Updated members for team ${existing.name}`,
    });

    return adminTeamService.getById(id);
  },
};
