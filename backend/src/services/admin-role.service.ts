import { Request } from 'express';
import { adminRoleRepository, AdminRoleWithRelations } from '../repositories/admin-role.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import {
  CreateRoleInput,
  UpdateRoleInput,
  CloneRoleInput,
  AssignPermissionsInput,
} from '../validators/admin-role.validator';

// SUPER_ADMIN is the root of the role hierarchy and must always exist —
// it can be edited (description only) but never renamed or deleted.
const PROTECTED_ROLES = ['SUPER_ADMIN'];

function serialize(role: AdminRoleWithRelations) {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    userCount: role._count.userRoles,
    permissions: role.rolePermissions.map((rp) => ({ id: rp.permission.id, name: rp.permission.name })),
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

export const adminRoleService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const search = (query.search as string) || undefined;

    const { rows, total } = await adminRoleRepository.findManyPaginated({ skip, take, search });

    return {
      data: rows.map(serialize),
      meta: buildPaginationMeta(page, pageSize, total),
    };
  },

  async getById(id: string) {
    const role = await adminRoleRepository.findById(id);
    if (!role) {
      throw new AppError('Role not found', 404);
    }
    return serialize(role);
  },

  async create(input: CreateRoleInput, actorId: string) {
    const existing = await adminRoleRepository.findByName(input.name);
    if (existing) {
      throw new AppError('Role name already exists', 409);
    }

    const role = await adminRoleRepository.create({ name: input.name, description: input.description });

    if (input.permissionIds && input.permissionIds.length > 0) {
      await adminRoleRepository.setPermissions(role.id, input.permissionIds);
    }

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'Role',
      entityId: role.id,
      description: `Created role ${role.name}`,
    });

    return adminRoleService.getById(role.id);
  },

  async update(id: string, input: UpdateRoleInput, actorId: string) {
    const existing = await adminRoleRepository.findById(id);
    if (!existing) {
      throw new AppError('Role not found', 404);
    }

    if (PROTECTED_ROLES.includes(existing.name) && input.name && input.name !== existing.name) {
      throw new AppError(`The ${existing.name} role name cannot be changed`, 403);
    }

    if (input.name && input.name !== existing.name) {
      const nameTaken = await adminRoleRepository.findByName(input.name);
      if (nameTaken) {
        throw new AppError('Role name already exists', 409);
      }
    }

    await adminRoleRepository.update(id, { name: input.name, description: input.description });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Role',
      entityId: id,
      description: `Updated role ${existing.name}`,
    });

    return adminRoleService.getById(id);
  },

  async remove(id: string, actorId: string) {
    const existing = await adminRoleRepository.findById(id);
    if (!existing) {
      throw new AppError('Role not found', 404);
    }

    if (PROTECTED_ROLES.includes(existing.name)) {
      throw new AppError(`The ${existing.name} role cannot be deleted`, 403);
    }

    const userCount = await adminRoleRepository.countUsers(id);
    if (userCount > 0) {
      throw new AppError(
        `Cannot delete role "${existing.name}" — it is still assigned to ${userCount} user(s). Reassign them first.`,
        409
      );
    }

    await adminRoleRepository.delete(id);

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'Role',
      entityId: id,
      description: `Deleted role ${existing.name}`,
    });
  },

  async clone(id: string, input: CloneRoleInput, actorId: string) {
    const source = await adminRoleRepository.findById(id);
    if (!source) {
      throw new AppError('Role not found', 404);
    }

    const nameTaken = await adminRoleRepository.findByName(input.name);
    if (nameTaken) {
      throw new AppError('Role name already exists', 409);
    }

    const cloned = await adminRoleRepository.create({
      name: input.name,
      description: input.description ?? `Cloned from ${source.name}`,
    });

    const permissionIds = source.rolePermissions.map((rp) => rp.permissionId);
    if (permissionIds.length > 0) {
      await adminRoleRepository.setPermissions(cloned.id, permissionIds);
    }

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'Role',
      entityId: cloned.id,
      description: `Cloned role ${cloned.name} from ${source.name}`,
    });

    return adminRoleService.getById(cloned.id);
  },

  async assignPermissions(id: string, input: AssignPermissionsInput, actorId: string) {
    const existing = await adminRoleRepository.findById(id);
    if (!existing) {
      throw new AppError('Role not found', 404);
    }

    await adminRoleRepository.setPermissions(id, input.permissionIds);

    await auditService.record({
      userId: actorId,
      action: 'PERMISSION_CHANGE',
      entityType: 'Role',
      entityId: id,
      description: `Updated permissions for role ${existing.name}`,
    });

    return adminRoleService.getById(id);
  },
};
