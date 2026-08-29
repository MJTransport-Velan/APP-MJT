import { z } from 'zod';

const transactionTypeEnum = z.enum(['PURCHASE', 'ISSUE', 'RETURN', 'ADJUSTMENT']);

export const listAdBlueStockTransactionsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    vehicleId: z.string().uuid().optional(),
    supplierId: z.string().uuid().optional(),
    type: transactionTypeEnum.optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  }),
});

export const adBlueStockTransactionIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid AdBlue stock transaction id') }),
});

// Buying AdBlue into the store. Litres and the money paid are both
// required: the store values what it holds, so a purchase with no rupee
// figure would leave later issues with nothing to cost them against. No
// vehicle is named on purpose — the drums go to the yard, not to a truck.
export const purchaseAdBlueStockSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    quantityLiters: z.number().positive('Quantity must be greater than 0'),
    // Either the total or the rate is enough; the other is derived.
    ratePerLiter: z.number().positive('Rate per litre must be greater than 0').optional(),
    amount: z.number().positive('Amount must be greater than 0').optional(),
    supplierId: z.string().uuid().optional(),
    fundAccountType: z.enum(['BANK', 'CASH']).optional(),
    fundAccountId: z.string().uuid().optional(),
    transactionDate: z.string().optional(),
    invoiceNumber: z.string().optional(),
    referenceNumber: z.string().optional(),
    remarks: z.string().optional(),
  }).refine((body) => body.amount != null || body.ratePerLiter != null, {
    message: 'Enter the amount paid or the rate per litre',
    path: ['amount'],
  }),
});

// Stock sent back to the supplier — litres leave the store and the money
// comes back to the Bank/Cash account. Valued at the store's own average
// rate, not at whatever the newest drum cost, so what is left behind keeps
// costing what it actually cost.
export const returnAdBlueStockSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    quantityLiters: z.number().positive('Quantity must be greater than 0'),
    supplierId: z.string().uuid().optional(),
    fundAccountType: z.enum(['BANK', 'CASH']).optional(),
    fundAccountId: z.string().uuid().optional(),
    transactionDate: z.string().optional(),
    referenceNumber: z.string().optional(),
    remarks: z.string().optional(),
  }),
});

// Lining the book stock up with a physical count — spillage, evaporation,
// a mis-measured drum. Always requires remarks, because no purchase or
// top-up stands behind it.
export const adjustAdBlueStockSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    quantityLiters: z.number().positive('Quantity must be greater than 0'),
    direction: z.enum(['INCREASE', 'DECREASE']),
    ratePerLiter: z.number().positive('Rate per litre must be greater than 0').optional(),
    transactionDate: z.string().optional(),
    remarks: z.string().min(1, 'Remarks are required for a stock adjustment'),
  }),
});

// Type is not editable (a PURCHASE and a RETURN move money in opposite
// directions and carry different required fields — delete and re-add covers
// that). ISSUE rows are not editable here at all: the AdBlue entry owns
// them, so the top-up is what gets corrected.
export const updateAdBlueStockTransactionSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid AdBlue stock transaction id') }),
  body: z.object({
    quantityLiters: z.number().positive('Quantity must be greater than 0').optional(),
    ratePerLiter: z.number().positive('Rate per litre must be greater than 0').optional(),
    amount: z.number().positive('Amount must be greater than 0').optional(),
    supplierId: z.string().uuid().nullable().optional(),
    transactionDate: z.string().optional(),
    invoiceNumber: z.string().nullable().optional(),
    referenceNumber: z.string().nullable().optional(),
    remarks: z.string().nullable().optional(),
    fundAccountType: z.enum(['BANK', 'CASH']).optional(),
    fundAccountId: z.string().uuid().optional(),
  }),
});

export type PurchaseAdBlueStockInput = z.infer<typeof purchaseAdBlueStockSchema>['body'];
export type ReturnAdBlueStockInput = z.infer<typeof returnAdBlueStockSchema>['body'];
export type AdjustAdBlueStockInput = z.infer<typeof adjustAdBlueStockSchema>['body'];
export type UpdateAdBlueStockTransactionInput = z.infer<typeof updateAdBlueStockTransactionSchema>['body'];
