import { prisma } from '../config/db';

export const roleRepository = {
  findAll() {
    return prisma.role.findMany();
  },

  findByName(name: string) {
    return prisma.role.findUnique({ where: { name } });
  },
};
