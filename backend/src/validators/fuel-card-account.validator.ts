import { z } from 'zod';

const transactionTypeEnum = z.enum(['RECHARGE', 'USAGE', 'REFUND', 'ADJUSTMENT']);

export const listFuelCardTransactionsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    fuelCardId: z.string().uuid().optional(),
    vehicleId: z.string().uuid().optional(),
    type: transactionTypeEnum.optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  }),
});

export const fuelCardTransactionIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid transaction id') }),
});

// A recharge is deliberately account-level: there is no fuelCardId here,
// because the money tops up the one shared balance that every card spends
// from. Picking a card at recharge time would imply a per-card balance the
// account does not have.
export const rechargeFuelCardAccountSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    amount: z.number().positive('Recharge amount must be greater than 0'),
    fundAccountType: z.enum(['BANK', 'CASH']).optional(),
    fundAccountId: z.string().uuid().optional(),
    transactionDate: z.string().optional(),
    referenceNumber: z.string().optional(),
    remarks: z.string().optional(),
  }),
});

// Money the fuel company put back on the account — a reversed swipe, an
// unused-litres credit. Credits the shared balance and does not touch
// Bank/Cash, exactly like a FastTag refund.
export const refundFuelCardAccountSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    amount: z.number().positive('Refund amount must be greater than 0'),
    fuelCardId: z.string().uuid().optional(),
    vehicleId: z.string().uuid().optional(),
    transactionDate: z.string().optional(),
    referenceNumber: z.string().optional(),
    remarks: z.string().optional(),
  }),
});

export const adjustFuelCardAccountSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    amount: z.number().positive('Adjustment amount must be greater than 0'),
    direction: z.enum(['INCREASE', 'DECREASE']),
    transactionDate: z.string().optional(),
    remarks: z.string().min(1, 'Remarks are required for a balance adjustment'),
  }),
});

// Type is not editable (a RECHARGE and a REFUND move different money and
// carry different required fields — delete and re-add covers that). USAGE
// rows are not editable here at all: the fuel entry owns them, so the fill
// is what gets corrected. See fuelCardAccountService.updateTransaction.
export const updateFuelCardTransactionSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid transaction id') }),
  body: z.object({
    amount: z.number().positive('Amount must be greater than 0').optional(),
    fuelCardId: z.string().uuid().nullable().optional(),
    vehicleId: z.string().uuid().nullable().optional(),
    transactionDate: z.string().optional(),
    referenceNumber: z.string().nullable().optional(),
    remarks: z.string().nullable().optional(),
    fundAccountType: z.enum(['BANK', 'CASH']).optional(),
    fundAccountId: z.string().uuid().optional(),
  }),
});

export type RechargeFuelCardAccountInput = z.infer<typeof rechargeFuelCardAccountSchema>['body'];
export type RefundFuelCardAccountInput = z.infer<typeof refundFuelCardAccountSchema>['body'];
export type AdjustFuelCardAccountInput = z.infer<typeof adjustFuelCardAccountSchema>['body'];
export type UpdateFuelCardTransactionInput = z.infer<typeof updateFuelCardTransactionSchema>['body'];
