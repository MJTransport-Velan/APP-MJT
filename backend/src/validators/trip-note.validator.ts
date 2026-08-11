import { z } from 'zod';

export const listTripNotesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    tripId: z.string().uuid('A valid trip is required'),
  }),
});

export const createTripNoteSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    tripId: z.string().uuid('A valid trip is required'),
    note: z.string().min(1, 'Note text is required'),
  }),
});

export type CreateTripNoteInput = z.infer<typeof createTripNoteSchema>['body'];
