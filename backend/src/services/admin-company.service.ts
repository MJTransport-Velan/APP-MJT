import { Request } from 'express';
import { adminCompanyRepository, AdminCompanyWithGroup } from '../repositories/admin-company.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateCompanyInput, UpdateCompanyInput } from '../validators/admin-company.validator';
import { forcedCompanyScope } from '../utils/groupAccess';

function serialize(company: AdminCompanyWithGroup) {
  return {
    id: company.id,
    name: company.name,
    code: company.code,
    contactPerson: company.contactPerson,
    phone: company.phone,
    email: company.email,
    address: company.address,
    logo: company.logo,
    gstNumber: company.gstNumber,
    panNumber: company.panNumber,
    isActive: company.isActive,
    group: { id: company.group.id, name: company.group.name },
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
  };
}

export const adminCompanyService = {
  async list(query: Request['query'], roles: string[] = [], userId?: string) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const search = (query.search as string) || undefined;
    const isActive = query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined;
    const groupId = (query.groupId as string) || undefined;
    // Group-scoped roles (Intent Creator, Accounts Executive, etc.) only ever
    // see companies in their own group — this feeds every company picker
    // across the app (Create Intent, Invoices, Receipts), not just this list page.
    const companyIds = userId ? await forcedCompanyScope(roles, userId) : undefined;

    const { rows, total } = await adminCompanyRepository.findManyPaginated({ skip, take, search, isActive, groupId, companyIds });

    return {
      data: rows.map(serialize),
      meta: buildPaginationMeta(page, pageSize, total),
    };
  },

  async getById(id: string, roles: string[] = [], userId?: string) {
    const company = await adminCompanyRepository.findById(id);
    if (!company) {
      throw new AppError('Company not found', 404);
    }
    if (userId) {
      const scope = await forcedCompanyScope(roles, userId);
      if (scope !== undefined && !scope.includes(id)) {
        throw new AppError('You do not have access to this company', 403);
      }
    }
    return serialize(company);
  },

  async create(input: CreateCompanyInput, actorId: string) {
    const codeTaken = await adminCompanyRepository.findByCode(input.code);
    if (codeTaken) {
      throw new AppError('Company code already exists', 409);
    }

    const group = await adminCompanyRepository.findGroupById(input.groupId);
    if (!group) {
      throw new AppError('Group not found', 404);
    }

    const company = await adminCompanyRepository.create({
      ...input,
      createdById: actorId,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'Company',
      entityId: company.id,
      description: `Created company ${company.name} in group ${group.name}`,
    });

    return adminCompanyService.getById(company.id);
  },

  async update(id: string, input: UpdateCompanyInput, actorId: string) {
    const existing = await adminCompanyRepository.findById(id);
    if (!existing) {
      throw new AppError('Company not found', 404);
    }

    let newGroup = null;
    if (input.groupId && input.groupId !== existing.groupId) {
      newGroup = await adminCompanyRepository.findGroupById(input.groupId);
      if (!newGroup) {
        throw new AppError('Group not found', 404);
      }
    }

    await adminCompanyRepository.update(id, { ...input, updatedById: actorId });

    if (newGroup) {
      await auditService.record({
        userId: actorId,
        action: 'GROUP_REASSIGNMENT',
        entityType: 'Company',
        entityId: id,
        description: `Moved company ${existing.name} from group ${existing.group.name} to group ${newGroup.name}`,
      });
    } else {
      await auditService.record({
        userId: actorId,
        action: 'UPDATE',
        entityType: 'Company',
        entityId: id,
        description: `Updated company ${existing.name}`,
      });
    }

    return adminCompanyService.getById(id);
  },

  async setLogo(id: string, logoPath: string, actorId: string) {
    const existing = await adminCompanyRepository.findById(id);
    if (!existing) {
      throw new AppError('Company not found', 404);
    }

    await adminCompanyRepository.setLogo(id, logoPath, actorId);

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Company',
      entityId: id,
      description: `Updated logo for company ${existing.name}`,
    });

    return adminCompanyService.getById(id);
  },

  async toggleStatus(id: string, actorId: string) {
    const existing = await adminCompanyRepository.findById(id);
    if (!existing) {
      throw new AppError('Company not found', 404);
    }

    await adminCompanyRepository.toggleStatus(id, !existing.isActive, actorId);

    await auditService.record({
      userId: actorId,
      action: existing.isActive ? 'DEACTIVATE' : 'ACTIVATE',
      entityType: 'Company',
      entityId: id,
      description: `${existing.isActive ? 'Deactivated' : 'Activated'} company ${existing.name}`,
    });

    return adminCompanyService.getById(id);
  },

  // Phase 3: soft delete (sets deletedAt + isActive false) rather than the
  // hard delete used previously — consistent with every other Masters
  // module and reversible if a company was removed by mistake.
  async remove(id: string, actorId: string) {
    const existing = await adminCompanyRepository.findById(id);
    if (!existing) {
      throw new AppError('Company not found', 404);
    }

    await adminCompanyRepository.softDelete(id, actorId);

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'Company',
      entityId: id,
      description: `Deleted company ${existing.name}`,
    });
  },
};
