import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const listExchangeRatesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({ currencyId: z.string().uuid('currencyId is required') }),
});

export const exchangeRateIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid exchange rate id') }),
});

export const createExchangeRateSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    currencyId: z.string().uuid('currencyId is required'),
    rateDate: isoDate,
    rateToBase: z.number().positive('rateToBase must be greater than 0'),
    source: z.enum(['MANUAL', 'API']).optional(),
  }),
});

export const updateExchangeRateSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid exchange rate id') }),
  body: z.object({
    rateToBase: z.number().positive('rateToBase must be greater than 0'),
  }),
});

export type CreateExchangeRateInput = z.infer<typeof createExchangeRateSchema>['body'];
export type UpdateExchangeRateInput = z.infer<typeof updateExchangeRateSchema>['body'];
