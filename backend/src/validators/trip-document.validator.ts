import { z } from 'zod';

export const listTripDocumentsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    tripId: z.string().uuid().optional(),
    type: z.enum(['POD', 'LR_COPY', 'INVOICE_COPY', 'DELIVERY_PROOF', 'OTHER']).optional(),
  }),
});

export const tripDocumentIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid document id') }),
});

export const uploadTripDocumentSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    tripId: z.string().uuid('A valid trip is required'),
    type: z.enum(['POD', 'LR_COPY', 'INVOICE_COPY', 'DELIVERY_PROOF', 'OTHER']),
    remarks: z.string().optional(),
  }),
});

export const verifyTripDocumentSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid document id') }),
  body: z.object({
    status: z.enum(['VERIFIED', 'REJECTED']),
    remarks: z.string().optional(),
  }),
});

export type UploadTripDocumentInput = z.infer<typeof uploadTripDocumentSchema>['body'];
