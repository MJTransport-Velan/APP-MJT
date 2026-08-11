import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

const structureWithRelations = Prisma.validator<Prisma.SalaryStructureInclude>()({
  employee: true,
  components: true,
});

export type SalaryStructureWithRelations = Prisma.SalaryStructureGetPayload<{ include: typeof structureWithRelations }>;

export const salaryStructureRepository = {
  findManyForEmployee(employeeId: string) {
    return prisma.salaryStructure.findMany({ where: { employeeId, deletedAt: null }, include: structureWithRelations, orderBy: { effectiveFrom: 'desc' } });
  },

  findActiveForEmployee(employeeId: string) {
    return prisma.salaryStructure.findFirst({ where: { employeeId, isActive: true, deletedAt: null }, include: structureWithRelations });
  },

  findById(id: string) {
    return prisma.salaryStructure.findFirst({ where: { id, deletedAt: null }, include: structureWithRelations });
  },

  findEmployeeById(id: string) {
    return prisma.employee.findFirst({ where: { id, deletedAt: null } });
  },

  deactivateAllForEmployee(employeeId: string, updatedById: string) {
    return prisma.salaryStructure.updateMany({ where: { employeeId, isActive: true }, data: { isActive: false, updatedById } });
  },

  create(data: Prisma.SalaryStructureUncheckedCreateInput) {
    return prisma.salaryStructure.create({ data, include: structureWithRelations });
  },

  createComponents(data: Prisma.SalaryStructureComponentUncheckedCreateInput[]) {
    if (data.length === 0) return Promise.resolve();
    return prisma.salaryStructureComponent.createMany({ data });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.salaryStructure.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedById } });
  },
};
