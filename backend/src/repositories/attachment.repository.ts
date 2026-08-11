import { Prisma, AttachmentStatus } from '@prisma/client';
import { prisma } from '../config/db';

export const attachmentRepository = {
  findForEntity(entityType: string, entityId: string) {
    return prisma.attachment.findMany({ where: { entityType, entityId, deletedAt: null }, orderBy: { uploadedAt: 'desc' } });
  },

  findById(id: string) {
    return prisma.attachment.findFirst({ where: { id, deletedAt: null } });
  },

  create(data: Prisma.AttachmentUncheckedCreateInput) {
    return prisma.attachment.create({ data });
  },

  softDelete(id: string) {
    return prisma.attachment.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  setStatus(id: string, status: AttachmentStatus, remarks: string | undefined, verifiedById: string) {
    return prisma.attachment.update({
      where: { id },
      data: { status, remarks, verifiedById, verifiedAt: new Date() },
    });
  },
};
