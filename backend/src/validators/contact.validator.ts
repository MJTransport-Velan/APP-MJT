import { z } from 'zod';

/**
 * Contact enquiries from the public MJ Express website. Bounds mirror the ones
 * the site's own form enforces, so a valid submission there is a valid one here.
 */
export const createContactEnquirySchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
    phone: z.string().trim().regex(/^[0-9+\s-]{7,15}$/, 'Please provide a valid phone number'),
    email: z.string().trim().email('Please provide a valid email address').max(254).optional().or(z.literal('')),
    message: z.string().trim().min(10, 'Message must be at least 10 characters').max(2000),
  }),
});

export type CreateContactEnquiryInput = z.infer<typeof createContactEnquirySchema>['body'];
