import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

export const exchangeRateRepository = {
  findForCurrency(currencyId: string) {
    return prisma.exchangeRate.findMany({ where: { currencyId }, orderBy: { rateDate: 'desc' } });
  },

  findById(id: string) {
    return prisma.exchangeRate.findUnique({ where: { id } });
  },

  findByDate(currencyId: string, rateDate: Date) {
    return prisma.exchangeRate.findUnique({ where: { currencyId_rateDate: { currencyId, rateDate } } });
  },

  create(data: Prisma.ExchangeRateUncheckedCreateInput) {
    return prisma.exchangeRate.create({ data });
  },

  update(id: string, data: Prisma.ExchangeRateUncheckedUpdateInput) {
    return prisma.exchangeRate.update({ where: { id }, data });
  },

  remove(id: string) {
    return prisma.exchangeRate.delete({ where: { id } });
  },
};
