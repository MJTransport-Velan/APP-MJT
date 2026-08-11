import { exchangeRateRepository } from '../repositories/exchange-rate.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { prisma } from '../config/db';
import { CreateExchangeRateInput, UpdateExchangeRateInput } from '../validators/exchange-rate.validator';

function toUtcDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

export const exchangeRateService = {
  async listForCurrency(currencyId: string) {
    return exchangeRateRepository.findForCurrency(currencyId);
  },

  async create(input: CreateExchangeRateInput, actorId: string) {
    const currency = await prisma.currency.findFirst({ where: { id: input.currencyId, deletedAt: null } });
    if (!currency) throw new AppError('Currency not found', 422);

    const rateDate = toUtcDate(input.rateDate);
    const existing = await exchangeRateRepository.findByDate(input.currencyId, rateDate);
    if (existing) {
      throw new AppError(`An exchange rate for ${currency.code} on ${input.rateDate} already exists`, 409);
    }

    const rate = await exchangeRateRepository.create({
      currencyId: input.currencyId,
      rateDate,
      rateToBase: input.rateToBase,
      source: input.source ?? 'MANUAL',
      createdById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'ExchangeRate',
      entityId: rate.id,
      description: `Recorded exchange rate for ${currency.code} on ${input.rateDate}`,
    });

    return rate;
  },

  async update(id: string, input: UpdateExchangeRateInput, actorId: string) {
    const existing = await exchangeRateRepository.findById(id);
    if (!existing) throw new AppError('Exchange Rate not found', 404);

    const updated = await exchangeRateRepository.update(id, { rateToBase: input.rateToBase });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'ExchangeRate',
      entityId: id,
      description: 'Updated exchange rate',
    });

    return updated;
  },

  async remove(id: string, actorId: string) {
    const existing = await exchangeRateRepository.findById(id);
    if (!existing) throw new AppError('Exchange Rate not found', 404);

    await exchangeRateRepository.remove(id);

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'ExchangeRate',
      entityId: id,
      description: 'Deleted exchange rate',
    });
  },
};
