import { z } from 'zod';

const lenderTypeEnum = z.enum(['BANK', 'NBFC', 'PRIVATE_FINANCE', 'INTERNAL']);

export const listVehicleLoansSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    vehicleId: z.string().uuid().optional(),
    status: z.enum(['PENDING_APPROVAL', 'ACTIVE', 'CLOSED', 'FORECLOSED', 'REJECTED']).optional(),
  }),
});

export const vehicleLoanIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid loan id') }),
});

export const createVehicleLoanSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    vehicleId: z.string().uuid('A valid vehicle is required'),
    lenderType: lenderTypeEnum,
    lenderName: z.string().min(1, 'Lender name is required'),
    loanAccountNumber: z.string().optional(),
    principalAmount: z.number().positive('Principal must be greater than 0'),
    processingFee: z.number().min(0).optional(),
    interestRatePercent: z.number().min(0).max(100, 'Interest rate must be a percentage'),
    disbursementDate: z.string().min(1, 'Disbursement date is required'),
    emiStartDate: z.string().min(1, 'EMI start date is required'),
    tenureMonths: z.number().int().min(1).max(240, 'Tenure must be between 1 and 240 months'),
  }),
});

export const rejectVehicleLoanSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid loan id') }),
  body: z.object({ reason: z.string().optional() }),
});

export const createDisbursementSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid loan id') }),
  body: z.object({
    amount: z.number().positive('Amount must be greater than 0'),
    disbursementDate: z.string().optional(),
    fundAccountType: z.enum(['BANK', 'CASH']).optional(),
    fundAccountId: z.string().uuid().optional(),
  }),
});

export const payInstallmentSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid loan id'), installmentId: z.string().uuid('Invalid installment id') }),
  body: z.object({
    fundAccountType: z.enum(['BANK', 'CASH']).optional(),
    fundAccountId: z.string().uuid().optional(),
    lateFeeAmount: z.number().min(0).optional(),
  }),
});

export const forecloseSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid loan id') }),
  body: z.object({
    fundAccountType: z.enum(['BANK', 'CASH']).optional(),
    fundAccountId: z.string().uuid().optional(),
  }),
});

export type CreateVehicleLoanInput = z.infer<typeof createVehicleLoanSchema>['body'];
export type CreateDisbursementInput = z.infer<typeof createDisbursementSchema>['body'];
export type PayInstallmentInput = z.infer<typeof payInstallmentSchema>['body'];
