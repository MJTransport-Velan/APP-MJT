import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

export const approvalDelegationRepository = {
  create(data: Prisma.ApprovalDelegationUncheckedCreateInput) {
    return prisma.approvalDelegation.create({ data });
  },

  findAll(organizationId: string) {
    return prisma.approvalDelegation.findMany({ where: { organizationId }, orderBy: { fromDate: 'desc' } });
  },

  findById(id: string) {
    return prisma.approvalDelegation.findUnique({ where: { id } });
  },

  deactivate(id: string) {
    return prisma.approvalDelegation.update({ where: { id }, data: { isActive: false } });
  },

  /** Currently-in-effect delegation for a given approver, if any — used to redirect a pending approval to the temporary substitute. */
  findActiveFor(fromUserId: string, at: Date) {
    return prisma.approvalDelegation.findFirst({
      where: { fromUserId, isActive: true, fromDate: { lte: at }, toDate: { gte: at } },
      orderBy: { fromDate: 'desc' },
    });
  },
};
