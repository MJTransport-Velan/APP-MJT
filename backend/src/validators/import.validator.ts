import { z } from 'zod';

const entityTypeEnum = z.enum(['SUPPLIER', 'EMPLOYEE', 'DRIVER', 'FUEL_ENTRY', 'FASTTAG_TRANSACTION']);

export const runImportSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({ entityType: entityTypeEnum }),
});

export const listImportBatchesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({ page: z.string().optional(), pageSize: z.string().optional(), entityType: entityTypeEnum.optional() }),
});

export const importBatchIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid import batch id') }),
});

export const sampleImportSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({ entityType: entityTypeEnum }),
});
