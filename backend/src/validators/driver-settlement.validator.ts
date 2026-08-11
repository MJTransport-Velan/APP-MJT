import { z } from 'zod';

const settlementTypeEnum = z.enum(['PARTIAL', 'FINAL', 'EXIT', 'YEAR_END']);

export const listDriverSettlementsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    driverId: z.string().uuid().optional(),
    status: z.enum(['DRAFT', 'CALCULATED', 'APPROVED', 'PAID']).optional(),
  }),
});

export const driverSettlementIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid settlement id') }),
});

export const createDriverSettlementSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    driverId: z.string().uuid('A valid driver is required'),
    settlementType: settlementTypeEnum.optional(),
    periodStart: z.string().min(1, 'Period start date is required'),
    periodEnd: z.string().min(1, 'Period end date is required'),
  }),
});

export const previewDriverSettlementSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    driverId: z.string().uuid('A valid driver is required'),
    periodStart: z.string().min(1, 'Period start date is required'),
    periodEnd: z.string().min(1, 'Period end date is required'),
  }),
});

export type CreateDriverSettlementInput = z.infer<typeof createDriverSettlementSchema>['body'];
