import { Request } from 'express';
import { Prisma } from '@prisma/client';
import { adminPermissionRepository } from '../repositories/admin-permission.repository';

interface PermissionDto {
  id: string;
  name: string;
  module: string;
  action: string;
  description: string | null;
  createdAt: Date;
}

// Permissions follow a "module.action" naming convention throughout the
// codebase (dashboard.view, user.create, role.assign_permissions, ...).
// Rather than storing module/action as separate columns (which would require
// keeping them in sync with `name` everywhere), we derive them from the name.
function toDto(permission: { id: string; name: string; description: string | null; createdAt: Date }): PermissionDto {
  const [module, ...actionParts] = permission.name.split('.');
  return {
    id: permission.id,
    name: permission.name,
    module,
    action: actionParts.join('.') || module,
    description: permission.description,
    createdAt: permission.createdAt,
  };
}

export const adminPermissionService = {
  async list(query: Request['query']) {
    const search = (query.search as string) || undefined;
    const moduleFilter = (query.module as string) || undefined;

    const where: Prisma.PermissionWhereInput = {
      AND: [
        search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {},
        moduleFilter ? { name: { startsWith: `${moduleFilter}.` } } : {},
      ],
    };

    const permissions = await adminPermissionRepository.findMany(where);
    return permissions.map(toDto);
  },

  async grouped() {
    const permissions = await adminPermissionRepository.findMany({});
    const dtos = permissions.map(toDto);

    const groups = new Map<string, PermissionDto[]>();
    for (const dto of dtos) {
      if (!groups.has(dto.module)) {
        groups.set(dto.module, []);
      }
      groups.get(dto.module)!.push(dto);
    }

    return Array.from(groups.entries()).map(([module, items]) => ({ module, permissions: items }));
  },
};
