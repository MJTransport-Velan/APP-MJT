import { prisma } from '../config/db';

export const driverSalaryPaymentRepository = {
  findManyForDriver(driverId: string) {
    return prisma.driverSalaryPayment.findMany({
      where: { driverId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  },

  findDriverById(id: string) {
    return prisma.driver.findFirst({ where: { id, deletedAt: null } });
  },
};
