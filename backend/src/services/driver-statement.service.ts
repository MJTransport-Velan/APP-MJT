import { prisma } from '../config/db';
import { AppError } from '../middlewares/error.middleware';

/**
 * Driver History / Financial Statement — a running-balance view of every
 * advance given to a driver (the one mechanism this codebase has for
 * "give this person money," see financial-entry.service.ts). Each advance
 * increases what the driver owes; isSettled marks when it was recovered.
 */
export const driverStatementService = {
  async getStatement(driverId: string, from?: string, to?: string) {
    const driver = await prisma.driver.findFirst({ where: { id: driverId, deletedAt: null } });
    if (!driver) throw new AppError('Driver not found', 404);

    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(`${to}T23:59:59.999Z`) : undefined;

    const advances = await prisma.driverAdvance.findMany({
      where: {
        driverId,
        deletedAt: null,
        approvalStatus: 'APPROVED',
        ...(fromDate || toDate ? { createdAt: { gte: fromDate, lte: toDate } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      select: { advanceNumber: true, advanceType: true, purpose: true, amount: true, isSettled: true, createdAt: true },
    });

    let openingBalance = 0;
    if (fromDate) {
      const prior = await prisma.driverAdvance.aggregate({
        where: { driverId, deletedAt: null, approvalStatus: 'APPROVED', createdAt: { lt: fromDate } },
        _sum: { amount: true },
      });
      openingBalance = Number(prior._sum.amount ?? 0);
    }

    let running = openingBalance;
    const transactions = advances.map((a) => {
      running += Number(a.amount);
      return {
        advanceNumber: a.advanceNumber,
        date: a.createdAt,
        narration: `${a.advanceType} advance${a.purpose ? `: ${a.purpose}` : ''}`,
        debitAmount: a.amount,
        creditAmount: 0,
        isSettled: a.isSettled,
        runningBalance: Math.round(running * 100) / 100,
      };
    });

    return {
      driver: { id: driver.id, name: driver.name, code: driver.code },
      openingBalance: Math.round(openingBalance * 100) / 100,
      closingBalance: Math.round(running * 100) / 100,
      transactions,
    };
  },
};
