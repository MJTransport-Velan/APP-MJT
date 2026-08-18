import { z } from 'zod';

const categorySchema = z.enum(['operations', 'fleet', 'accounts', 'management']);

export const listReportQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    report: z.string().min(1, 'A report key is required'),
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    companyId: z.string().uuid().optional(),
    branchId: z.string().uuid().optional(),
    customerId: z.string().uuid().optional(),
    supplierId: z.string().uuid().optional(),
    vehicleId: z.string().uuid().optional(),
    driverId: z.string().uuid().optional(),
    tripStatus: z.string().optional(),
    vehicleTypeId: z.string().uuid().optional(),
    paymentStatus: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    year: z.string().optional(),
    month: z.string().optional(),
  }),
});

export const exportReportQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    category: categorySchema,
    report: z.string().min(1, 'A report key is required'),
    format: z.enum(['xlsx', 'pdf', 'csv', 'print']),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    companyId: z.string().uuid().optional(),
    branchId: z.string().uuid().optional(),
    customerId: z.string().uuid().optional(),
    supplierId: z.string().uuid().optional(),
    vehicleId: z.string().uuid().optional(),
    driverId: z.string().uuid().optional(),
    tripStatus: z.string().optional(),
    vehicleTypeId: z.string().uuid().optional(),
    paymentStatus: z.string().optional(),
    year: z.string().optional(),
    month: z.string().optional(),
  }),
});

export type ReportCategoryInput = z.infer<typeof categorySchema>;
