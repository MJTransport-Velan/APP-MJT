import { z } from 'zod';

const loanTypeEnum = z.enum(['VEHICLE_LOAN', 'BANK_LOAN', 'BUSINESS_LOAN', 'OWNER_LOAN', 'OTHER_LOAN']);
const loanStatusEnum = z.enum(['ACTIVE', 'CLOSED', 'FORECLOSED']);
const fundAccountTypeEnum = z.enum(['BANK', 'CASH']);
// OPENING = a loan that was already running when the business moved off its
// old system; NEW = taken out through this system.
const loanOriginEnum = z.enum(['OPENING', 'NEW']);
const migrationRecordStatusEnum = z.enum(['CONFIRMED', 'NEEDS_REVIEW', 'UNVERIFIED', 'RECLASSIFIED']);

export const listLoansSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    loanType: loanTypeEnum.optional(),
    status: loanStatusEnum.optional(),
    vehicleId: z.string().uuid().optional(),
    origin: loanOriginEnum.optional(),
  }),
});

export const loanIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid loan id') }),
});

const loanBody = z.object({
  loanName: z.string().min(1, 'Loan name is required'),
  lenderName: z.string().min(1, 'Lender / Bank is required'),
  loanType: loanTypeEnum,
  vehicleId: z.string().uuid().optional(),
  fixedAssetId: z.string().uuid().optional(),
  capitalPartnerId: z.string().uuid().optional(),
  loanStartDate: z.string().min(1, 'Loan start date is required'),
  principalAmount: z.number().positive('Loan amount must be greater than 0'),
  interestRatePercent: z.number().min(0, 'Interest rate cannot be negative').max(100, 'Interest rate looks too high').optional(),
  tenureMonths: z.number().int().positive('Tenure must be at least 1 month'),
  // Optional — when omitted the reducing-balance EMI is computed for you.
  emiAmount: z.number().positive('EMI amount must be greater than 0').optional(),
  firstEmiDate: z.string().min(1, 'First EMI date is required'),
  fundAccountType: fundAccountTypeEnum,
  fundAccountId: z.string().uuid('A valid payment account is required'),
  loanAccountRef: z.string().optional(),
  remarks: z.string().optional(),
  // Migration fields. For an OPENING loan, principalAmount is what is STILL
  // OWED on openingAsOfDate and tenureMonths is the number of EMIs LEFT, so
  // the generated schedule picks up where the old system left off. Old EMIs
  // are never recreated.
  origin: loanOriginEnum.optional(),
  originalPrincipal: z.number().positive('Original loan amount must be greater than 0').optional(),
  openingAsOfDate: z.string().optional(),
  migrationSource: z.string().optional(),
  migrationStatus: migrationRecordStatusEnum.optional(),
});

/** A Vehicle Loan is meaningless without its vehicle; an Owner Loan without its partner (spec §28). */
function assertTypeLinkage(b: { loanType: string; vehicleId?: string; capitalPartnerId?: string }, ctx: z.RefinementCtx) {
  if (b.loanType === 'VEHICLE_LOAN' && !b.vehicleId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['vehicleId'], message: 'A Vehicle Loan must be linked to a vehicle' });
  }
  if (b.loanType === 'OWNER_LOAN' && !b.capitalPartnerId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['capitalPartnerId'], message: 'An Owner Loan must be linked to an owner / partner' });
  }
}

export const createLoanSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: loanBody.superRefine(assertTypeLinkage),
});

// Money terms (principal / rate / tenure / EMI / first EMI date) are absent
// here on purpose: they define the generated schedule, and editing them
// underneath posted payments would desync it. Change them by deleting an
// unpaid loan and re-creating it.
export const updateLoanSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid loan id') }),
  body: z
    .object({
      loanName: z.string().min(1).optional(),
      lenderName: z.string().min(1).optional(),
      vehicleId: z.string().uuid().nullable().optional(),
      fixedAssetId: z.string().uuid().nullable().optional(),
      capitalPartnerId: z.string().uuid().nullable().optional(),
      fundAccountType: fundAccountTypeEnum.optional(),
      fundAccountId: z.string().uuid().optional(),
      loanAccountRef: z.string().nullable().optional(),
      status: loanStatusEnum.optional(),
      remarks: z.string().nullable().optional(),
    })
    .refine((b) => Object.keys(b).length > 0, { message: 'At least one field is required' }),
});

export const payEmiSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid loan id'),
    installmentId: z.string().uuid('Invalid installment id'),
  }),
  body: z.object({
    paidDate: z.string().optional(),
    // All three are optional overrides; the scheduled figures are used when
    // omitted. Supplying a partial split is rejected in the service so
    // Principal + Interest can always be checked against the EMI.
    paidAmount: z.number().positive('EMI amount must be greater than 0').optional(),
    principalComponent: z.number().min(0, 'Principal cannot be negative').optional(),
    interestComponent: z.number().min(0, 'Interest cannot be negative').optional(),
    fundAccountType: fundAccountTypeEnum,
    fundAccountId: z.string().uuid('A payment account must be selected'),
    paymentModeId: z.string().uuid().optional(),
    referenceNumber: z.string().optional(),
    remarks: z.string().optional(),
  }),
});

export const installmentIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid loan id'),
    installmentId: z.string().uuid('Invalid installment id'),
  }),
});

export const loanDashboardSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    vehicleId: z.string().uuid().optional(),
    loanType: loanTypeEnum.optional(),
    status: z.enum(['PENDING', 'PAID', 'OVERDUE', 'WAIVED']).optional(),
  }),
});

export type CreateLoanInput = z.infer<typeof loanBody>;
export type UpdateLoanInput = z.infer<typeof updateLoanSchema>['body'];
export type PayEmiInput = z.infer<typeof payEmiSchema>['body'];
