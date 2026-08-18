import { z } from 'zod';

// Generic "export whatever this list page is already showing" endpoint —
// the frontend already knows its own column labels/keys and has the row
// data in hand (from its own list API), so this just turns that JSON into
// a real .xlsx file. Capped at 20,000 rows as a defensive limit, not a
// realistic ceiling for this app's data volumes.
export const exportExcelSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    filename: z.string().min(1, 'Filename is required'),
    sheetName: z.string().max(31).optional(),
    columns: z
      .array(z.object({ header: z.string(), key: z.string() }))
      .min(1, 'At least one column is required'),
    rows: z.array(z.record(z.string(), z.unknown())).max(20000, 'Too many rows to export at once'),
  }),
});

export type ExportExcelInput = z.infer<typeof exportExcelSchema>['body'];
