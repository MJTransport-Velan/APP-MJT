import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

export const notificationRepository = {
  create(data: Prisma.NotificationUncheckedCreateInput) {
    return prisma.notification.create({ data });
  },

  async findForUser(params: { organizationId: string; userId: string; roleIds: string[]; isRead?: boolean; skip: number; take: number }) {
    const where: Prisma.NotificationWhereInput = {
      organizationId: params.organizationId,
      OR: [{ userId: params.userId }, { userId: null, roleId: { in: params.roleIds.length ? params.roleIds : ['__none__'] } }],
      ...(params.isRead !== undefined ? { isRead: params.isRead } : {}),
    };
    const [rows, total] = await prisma.$transaction([
      prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: params.skip, take: params.take }),
      prisma.notification.count({ where }),
    ]);
    return { rows, total };
  },

  unreadCount(organizationId: string, userId: string, roleIds: string[]) {
    return prisma.notification.count({
      where: {
        organizationId,
        isRead: false,
        OR: [{ userId }, { userId: null, roleId: { in: roleIds.length ? roleIds : ['__none__'] } }],
      },
    });
  },

  findById(id: string) {
    return prisma.notification.findUnique({ where: { id } });
  },

  markRead(id: string) {
    return prisma.notification.update({ where: { id }, data: { isRead: true, readAt: new Date() } });
  },

  markAllRead(organizationId: string, userId: string, roleIds: string[]) {
    return prisma.notification.updateMany({
      where: {
        organizationId,
        isRead: false,
        OR: [{ userId }, { userId: null, roleId: { in: roleIds.length ? roleIds : ['__none__'] } }],
      },
      data: { isRead: true, readAt: new Date() },
    });
  },

  findTemplateByCode(code: string) {
    return prisma.notificationTemplate.findFirst({ where: { code, isActive: true } });
  },

  listTemplates() {
    return prisma.notificationTemplate.findMany({ orderBy: { code: 'asc' } });
  },
};
