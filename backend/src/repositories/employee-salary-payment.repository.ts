import { prisma } from '../config/db';

export const employeeSalaryPaymentRepository = {
  findManyForEmployee(employeeId: string) {
    return prisma.employeeSalaryPayment.findMany({
      where: { employeeId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  },

  findEmployeeById(id: string) {
    return prisma.employee.findFirst({ where: { id, deletedAt: null } });
  },
};
