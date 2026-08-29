import { z } from 'zod';

const fundAccountTypeEnum = z.enum(['BANK', 'CASH']);
const statusEnum = z.enum(['OUTSTANDING', 'REPAID', 'WRITTEN_OFF']);
const originEnum = z.enum(['NEW', 'OPENING']);

export const listLoansGivenSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    status: statusEnum.optional(),
    // Lets the Opening Balance screen list only what was carried over from
    // the old books, the same way it filters Loans and Fixed Assets.
    origin: originEnum.optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  }),
});

export const loanGivenIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid loan id') }),
});

// partyName is free text: a friend or relative has no master record here,
// and forcing them into Customer/Supplier/Driver/Employee is exactly what
// left this money with nowhere to go.
export const createLoanGivenSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    partyName: z.string().min(1, 'Who the money was given to is required'),
    partyContact: z.string().optional(),
    amount: z.number().positive('Amount must be greater than 0'),
    givenDate: z.string().min(1, 'The date the money was given is required'),
    expectedReturnDate: z.string().optional(),
    fundAccountType: fundAccountTypeEnum,
    fundAccountId: z.string().uuid('A valid Bank/Cash account is required'),
    // OPENING = already out on the migration date, carried over from the old
    // books. The service then debits no account, because the opening Bank/Cash
    // balance already accounts for the money having left.
    origin: originEnum.optional(),
    openingAsOfDate: z.string().optional(),
    remarks: z.string().optional(),
  }),
});

// The amount and the account it came out of are editable so a mistyped
// figure can be corrected — the service reverses the original debit and
// re-applies the new one, and refuses to drop the amount below what has
// already been repaid.
export const updateLoanGivenSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid loan id') }),
  body: z
    .object({
      partyName: z.string().min(1).optional(),
      partyContact: z.string().nullable().optional(),
      amount: z.number().positive('Amount must be greater than 0').optional(),
      givenDate: z.string().min(1).optional(),
      expectedReturnDate: z.string().nullable().optional(),
      fundAccountType: fundAccountTypeEnum.optional(),
      fundAccountId: z.string().uuid().optional(),
      remarks: z.string().nullable().optional(),
    })
    .refine((b) => Object.keys(b).length > 0, { message: 'At least one field is required' }),
});

export const recordRepaymentSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid loan id') }),
  body: z.object({
    amount: z.number().positive('Repayment amount must be greater than 0'),
    repaymentDate: z.string().optional(),
    // Money coming back does not have to land in the account it left from.
    fundAccountType: fundAccountTypeEnum,
    fundAccountId: z.string().uuid('A valid Bank/Cash account is required'),
    referenceNumber: z.string().optional(),
    remarks: z.string().optional(),
  }),
});

export const repaymentIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid loan id'),
    repaymentId: z.string().uuid('Invalid repayment id'),
  }),
});

// Writing off is giving up on the money, so it always needs a reason — it
// drops the whole outstanding amount off the Balance Sheet.
export const writeOffLoanGivenSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid loan id') }),
  body: z.object({
    reason: z.string().min(1, 'A reason is required to write this money off'),
  }),
});

export type CreateLoanGivenInput = z.infer<typeof createLoanGivenSchema>['body'];
export type UpdateLoanGivenInput = z.infer<typeof updateLoanGivenSchema>['body'];
export type RecordRepaymentInput = z.infer<typeof recordRepaymentSchema>['body'];
export type WriteOffLoanGivenInput = z.infer<typeof writeOffLoanGivenSchema>['body'];
