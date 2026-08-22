import bcrypt from 'bcrypt';
import { Request } from 'express';
import { adminUserRepository, AdminUserWithRelations } from '../repositories/admin-user.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateAdminUserInput, UpdateAdminUserInput } from '../validators/admin-user.validator';
import { enforcePasswordPolicy } from '../utils/passwordPolicy.util';
import { userRepository } from '../repositories/user.repository';
import { prisma } from '../config/db';

/**
 * Role and team ids arrive as well-formed UUIDs that may still not exist.
 * Checking them here turns what would otherwise surface as a foreign-key
 * failure deep inside the write into a clear 422 naming the bad id — and,
 * critically, does so *before* any row is created.
 */
async function assertRolesExist(roleIds: string[]) {
  if (!roleIds.length) return;
  const found = await prisma.role.findMany({ where: { id: { in: roleIds } }, select: { id: true } });
  const missing = roleIds.filter((id) => !found.some((r) => r.id === id));
  if (missing.length) {
    throw new AppError(`Unknown role: ${missing.join(', ')}`, 422);
  }
}

async function assertTeamsExist(teamIds: string[]) {
  if (!teamIds.length) return;
  const found = await prisma.team.findMany({ where: { id: { in: teamIds } }, select: { id: true } });
  const missing = teamIds.filter((id) => !found.some((t) => t.id === id));
  if (missing.length) {
    throw new AppError(`Unknown team: ${missing.join(', ')}`, 422);
  }
}

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

    if (input.email) {
      const existingEmail = await adminUserRepository.findByEmail(input.email);
      if (existingEmail) {
        throw new AppError('Email already exists', 409);
      }
    }

    await assertRolesExist(input.roleIds ?? []);
    await assertTeamsExist(input.teamIds ?? []);

    const hashedPassword = await bcrypt.hash(input.password, 10);

    // One transaction: the account and its roles/teams are created together
    // or not at all. Creating them separately previously left a usable,
    // role-less account behind whenever the role write failed, while the
    // caller saw only a 500 and assumed nothing had happened.
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          username: input.username,
          email: input.email,
          phone: input.phone,
          fullName: input.fullName,
          password: hashedPassword,
        },
      });

      if (input.roleIds && input.roleIds.length > 0) {
        await tx.userRole.createMany({
          data: input.roleIds.map((roleId) => ({ userId: created.id, roleId })),
          skipDuplicates: true,
        });
      }
      if (input.teamIds && input.teamIds.length > 0) {
        await tx.userTeam.createMany({
          data: input.teamIds.map((teamId) => ({ userId: created.id, teamId })),
          skipDuplicates: true,
        });
      }

      return created;
    });

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

    if (input.email && input.email !== existing.email) {
      const existingEmail = await adminUserRepository.findByEmail(input.email);
      if (existingEmail && existingEmail.id !== id) {
        throw new AppError('Email already exists', 409);
      }
    }

    await adminUserRepository.update(id, {
      email: input.email,
      phone: input.phone,
      fullName: input.fullName,
    });

    if (input.roleIds) {
      await assertRolesExist(input.roleIds);
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
      await assertTeamsExist(input.teamIds);
      await adminUserRepository.setTeams(id, input.teamIds);
    }

    // Permissions are carried inside the access token, so a role or team
    // change only takes effect once the user's existing tokens are retired.
    if (input.roleIds || input.teamIds) {
      await userRepository.bumpTokenVersion(id);
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

    // Deactivating must end any session already in flight, not just block
    // the next login.
    if (!isActive) {
      await userRepository.bumpTokenVersion(id);
    }

    await auditService.record({
      userId: actorId,
      action: isActive ? 'ACTIVATE' : 'DEACTIVATE',
      entityType: 'User',
      entityId: id,
      description: `${isActive ? 'Activated' : 'Deactivated'} user ${existing.username}`,
    });

    return adminUserService.getById(id);
  },

  async remove(id: string, actorId: string) {
    if (id === actorId) {
      throw new AppError('You cannot delete your own account', 400);
    }

    const existing = await adminUserRepository.findById(id);
    if (!existing) {
      throw new AppError('User not found', 404);
    }

    await adminUserRepository.softDelete(id);

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'User',
      entityId: id,
      description: `Deleted user ${existing.username}`,
    });
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
