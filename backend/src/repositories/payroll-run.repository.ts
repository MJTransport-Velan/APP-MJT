import { Prisma, PayrollRunStatus } from '@prisma/client';
import { prisma } from '../config/db';

const runWithRelations = Prisma.validator<Prisma.PayrollRunInclude>()({
  lines: {
    include: {
      employee: true,
      components: true,
    },
  },
});

export type PayrollRunWithRelations = Prisma.PayrollRunGetPayload<{ include: typeof runWithRelations }>;

export const payrollRunRepository = {
  async findManyPaginated(params: { skip: number; take: number; search?: string; status?: PayrollRunStatus }) {
    const where: Prisma.PayrollRunWhereInput = {
      deletedAt: null,
      AND: [
        params.search ? { runNumber: { contains: params.search, mode: 'insensitive' } } : {},
        params.status ? { status: params.status } : {},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.payrollRun.findMany({ where, include: runWithRelations, orderBy: { createdAt: 'desc' }, skip: params.skip, take: params.take }),
      prisma.payrollRun.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.payrollRun.findFirst({ where: { id, deletedAt: null }, include: runWithRelations });
  },

  findByIdBasic(id: string) {
    return prisma.payrollRun.findFirst({ where: { id, deletedAt: null } });
  },

  findOverlapping(periodType: string, periodStart: Date, periodEnd: Date) {
    return prisma.payrollRun.findFirst({
      where: {
        periodType: periodType as never,
        status: { not: 'CANCELLED' },
        deletedAt: null,
        periodStart: { lte: periodEnd },
        periodEnd: { gte: periodStart },
      },
    });
  },

  async nextRunNumber() {
    const count = await prisma.payrollRun.count();
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `PYR-${datePart}-${String(count + 1).padStart(4, '0')}`;
  },

  create(data: Prisma.PayrollRunUncheckedCreateInput) {
    return prisma.payrollRun.create({ data });
  },

  update(id: string, data: Prisma.PayrollRunUncheckedUpdateInput) {
    return prisma.payrollRun.update({ where: { id }, data });
  },

  deleteLines(payrollRunId: string) {
    return prisma.payrollRunLine.deleteMany({ where: { payrollRunId } });
  },

  createLine(data: Prisma.PayrollRunLineUncheckedCreateInput) {
    return prisma.payrollRunLine.create({ data });
  },

  createLineComponents(data: Prisma.PayrollRunLineComponentUncheckedCreateInput[]) {
    if (data.length === 0) return Promise.resolve();
    return prisma.payrollRunLineComponent.createMany({ data });
  },

  updateLine(id: string, data: Prisma.PayrollRunLineUncheckedUpdateInput) {
    return prisma.payrollRunLine.update({ where: { id }, data });
  },

  findActiveEmployees() {
    return prisma.employee.findMany({ where: { isActive: true, deletedAt: null } });
  },

  findEmployeeById(id: string) {
    return prisma.employee.findFirst({ where: { id, deletedAt: null } });
  },

  findActiveSalaryStructure(employeeId: string) {
    return prisma.salaryStructure.findFirst({ where: { employeeId, isActive: true, deletedAt: null }, include: { components: true } });
  },
};
