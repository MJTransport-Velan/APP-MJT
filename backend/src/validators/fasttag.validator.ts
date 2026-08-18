import { z } from 'zod';

const transactionTypeEnum = z.enum(['RECHARGE', 'USAGE', 'REFUND', 'ADJUSTMENT']);
const transactionStatusEnum = z.enum(['IMPORTED', 'PENDING', 'VERIFIED', 'ALLOCATED', 'RECONCILED', 'CANCELLED', 'ADJUSTED']);
const paymentSourceEnum = z.enum(['FASTAG_WALLET', 'BANK', 'OTHER']);

export const listFastTagTransactionsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    vehicleId: z.string().uuid().optional(),
    tripId: z.string().uuid().optional(),
    type: transactionTypeEnum.optional(),
    status: transactionStatusEnum.optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  }),
});

export const fastTagTransactionIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid transaction id') }),
});

// The wallet is a fleet-wide singleton — there is no per-vehicle account id
// in any of these routes anymore.
export const rechargeFastTagSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    amount: z.number().positive('Recharge amount must be greater than 0'),
    fundAccountType: z.enum(['BANK', 'CASH']).optional(),
    fundAccountId: z.string().uuid().optional(),
    referenceNumber: z.string().optional(),
    remarks: z.string().optional(),
  }),
});

// Toll deduction. tollPlaza/location/transactionReference/paymentSource are
// the FASTag Entry screen's dedicated fields (see design brief) — none of
// these exist on the underlying Financial Entry engine, they're specific to
// this module and stored directly on FastTagTransaction. vehicleId is
// required — every toll swipe debits the shared wallet on behalf of one
// specific truck's tag. tripId is optional here only as an explicit
// override — fastTagService.logUsage() always resolves one (the vehicle's
// current trip, else its last trip) and hard-fails if neither exists, since
// a USAGE transaction must always have a trip.
export const logFastTagUsageSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    vehicleId: z.string().uuid('A valid vehicle is required'),
    amount: z.number().positive('Usage amount must be greater than 0'),
    tripId: z.string().uuid().optional(),
    transactionDate: z.string().optional(),
    tollPlaza: z.string().optional(),
    location: z.string().optional(),
    transactionReference: z.string().optional(),
    paymentSource: paymentSourceEnum.optional(),
    remarks: z.string().optional(),
  }),
});

export const refundFastTagSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    vehicleId: z.string().uuid().optional(),
    amount: z.number().positive('Refund amount must be greater than 0'),
    tripId: z.string().uuid().optional(),
    transactionDate: z.string().optional(),
    transactionReference: z.string().optional(),
    remarks: z.string().optional(),
  }),
});

export const adjustFastTagSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    amount: z.number().positive('Adjustment amount must be greater than 0'),
    direction: z.enum(['INCREASE', 'DECREASE']),
    remarks: z.string().min(1, 'Remarks are required for a balance adjustment'),
  }),
});

export const updateFastTagTransactionStatusSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid transaction id') }),
  body: z.object({
    status: transactionStatusEnum,
    remarks: z.string().optional(),
  }),
});

// Generic edit — type is intentionally not editable (turning a RECHARGE
// into a USAGE after the fact would need a different set of required
// fields and a different balance-sign rule; delete + re-add covers that
// rare case instead of complicating this one).
export const updateFastTagTransactionSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid transaction id') }),
  body: z.object({
    vehicleId: z.string().uuid().nullable().optional(),
    amount: z.number().positive('Amount must be greater than 0').optional(),
    tripId: z.string().uuid().nullable().optional(),
    transactionDate: z.string().optional(),
    tollPlaza: z.string().optional(),
    location: z.string().optional(),
    transactionReference: z.string().optional(),
    paymentSource: paymentSourceEnum.optional(),
    remarks: z.string().optional(),
    fundAccountType: z.enum(['BANK', 'CASH']).optional(),
    fundAccountId: z.string().uuid().optional(),
  }),
});

export type RechargeFastTagInput = z.infer<typeof rechargeFastTagSchema>['body'];
export type LogFastTagUsageInput = z.infer<typeof logFastTagUsageSchema>['body'];
export type RefundFastTagInput = z.infer<typeof refundFastTagSchema>['body'];
export type AdjustFastTagInput = z.infer<typeof adjustFastTagSchema>['body'];
export type UpdateFastTagTransactionStatusInput = z.infer<typeof updateFastTagTransactionStatusSchema>['body'];
export type UpdateFastTagTransactionInput = z.infer<typeof updateFastTagTransactionSchema>['body'];
