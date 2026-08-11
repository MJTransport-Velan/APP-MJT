import bcrypt from 'bcrypt';
import { Request } from 'express';
import { adminUserRepository, AdminUserWithRelations } from '../repositories/admin-user.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateAdminUserInput, UpdateAdminUserInput } from '../validators/admin-user.validator';
import { enforcePasswordPolicy } from '../utils/passwordPolicy.util';

function serialize(user: AdminUserWithRelations) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    phone: user.phone,
    fullName: user.fullName,
    isActive: user.isActive,
    profilePhoto: user.profilePhoto,
    roles: user.userRoles.map((ur) => ({ id: ur.role.id, name: ur.role.name })),
    teams: user.userTeams.map((ut) => ({
      id: ut.team.id,
      name: ut.team.name,
      department: ut.team.department.name,
    })),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export const adminUserService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const search = (query.search as string) || undefined;
    const isActive = query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined;
    const roleId = (query.roleId as string) || undefined;
    const teamId = (query.teamId as string) || undefined;

    const { rows, total } = await adminUserRepository.findManyPaginated({
      skip,
      take,
      search,
      isActive,
      roleId,
      teamId,
    });

    return {
      data: rows.map(serialize),
      meta: buildPaginationMeta(page, pageSize, total),
    };
  },

  async getById(id: string) {
    const user = await adminUserRepository.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return serialize(user);
  },

  async create(input: CreateAdminUserInput, actorId: string) {
    const existing = await adminUserRepository.findByUsername(input.username);
    if (existing) {
      throw new AppError('Username already exists', 409);
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);
    const user = await adminUserRepository.create({
      username: input.username,
      email: input.email,
      phone: input.phone,
      fullName: input.fullName,
      password: hashedPassword,
    });

    if (input.roleIds && input.roleIds.length > 0) {
      await adminUserRepository.setRoles(user.id, input.roleIds);
    }
    if (input.teamIds && input.teamIds.length > 0) {
      await adminUserRepository.setTeams(user.id, input.teamIds);
    }

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'User',
      entityId: user.id,
      description: `Created user ${user.username}`,
    });

    return adminUserService.getById(user.id);
  },

  async update(id: string, input: UpdateAdminUserInput, actorId: string) {
    const existing = await adminUserRepository.findById(id);
    if (!existing) {
      throw new AppError('User not found', 404);
    }

    await adminUserRepository.update(id, {
      email: input.email,
      phone: input.phone,
      fullName: input.fullName,
    });

    if (input.roleIds) {
      await adminUserRepository.setRoles(id, input.roleIds);
      await auditService.record({
        userId: actorId,
        action: 'ROLE_CHANGE',
        entityType: 'User',
        entityId: id,
        description: `Updated roles for user ${existing.username}`,
      });
    }

    if (input.teamIds) {
      await adminUserRepository.setTeams(id, input.teamIds);
    }

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'User',
      entityId: id,
      description: `Updated user ${existing.username}`,
    });

    return adminUserService.getById(id);
  },

  async setActive(id: string, isActive: boolean, actorId: string) {
    const existing = await adminUserRepository.findById(id);
    if (!existing) {
      throw new AppError('User not found', 404);
    }

    await adminUserRepository.setActive(id, isActive);

    await auditService.record({
      userId: actorId,
      action: isActive ? 'ACTIVATE' : 'DEACTIVATE',
      entityType: 'User',
      entityId: id,
      description: `${isActive ? 'Activated' : 'Deactivated'} user ${existing.username}`,
    });

    return adminUserService.getById(id);
  },

  async resetPassword(id: string, newPassword: string, actorId: string) {
    const existing = await adminUserRepository.findById(id);
    if (!existing) {
      throw new AppError('User not found', 404);
    }

    await enforcePasswordPolicy(newPassword);

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await adminUserRepository.setPassword(id, hashedPassword);

    await auditService.record({
      userId: actorId,
      action: 'PASSWORD_RESET',
      entityType: 'User',
      entityId: id,
      description: `Password reset for user ${existing.username}`,
    });
  },

  async uploadPhoto(id: string, relativePath: string, actorId: string) {
    const existing = await adminUserRepository.findById(id);
    if (!existing) {
      throw new AppError('User not found', 404);
    }

    await adminUserRepository.setProfilePhoto(id, relativePath);

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'User',
      entityId: id,
      description: `Updated profile photo for user ${existing.username}`,
    });

    return adminUserService.getById(id);
  },
};
