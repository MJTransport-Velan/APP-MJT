/**
 * AdBlue / DEF.
 *
 * Two ways it reaches a truck, and the fleet runs both:
 *
 *   FROM_STOCK      — drums bought in bulk and kept at the yard, then
 *                     poured into whichever truck needs topping up. Costed
 *                     at the store's own weighted-average rate; nobody
 *                     types a rate, because the fleet already paid for
 *                     those litres.
 *   DIRECT_PURCHASE — bought at a pump on the road, straight into the tank.
 *                     Nothing is stored, so nothing moves in the store.
 *
 * The store itself is one shared thing for the whole fleet, like the FASTag
 * wallet and the diesel card account — `AdBlueVehicleUsageRow` is how many
 * litres a truck has drawn from it, never a per-truck stock.
 */
export type AdBlueSource = 'FROM_STOCK' | 'DIRECT_PURCHASE';

export const ADBLUE_SOURCE_LABELS: Record<AdBlueSource, string> = {
  FROM_STOCK: 'From Stock',
  DIRECT_PURCHASE: 'Direct Purchase',
};

export type AdBlueStockTransactionType = 'PURCHASE' | 'ISSUE' | 'RETURN' | 'ADJUSTMENT';

export const ADBLUE_STOCK_TRANSACTION_LABELS: Record<AdBlueStockTransactionType, string> = {
  PURCHASE: 'Purchase',
  ISSUE: 'Issued to Vehicle',
  RETURN: 'Returned to Supplier',
  ADJUSTMENT: 'Adjustment',
};

export interface AdBlueStock {
  id: string;
  currentQuantityLiters: number;
  currentValue: number;
  /** null when the store is empty — there is no rate for nothing. */
  averageRatePerLiter: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdBlueStockTransaction {
  id: string;
  stockId: string;
  type: AdBlueStockTransactionType;
  /** Signed on an ADJUSTMENT row; positive on every other type. */
  quantityLiters: number;
  ratePerLiter: number | null;
  amount: number;
  vehicle: { id: string; registrationNumber: string } | null;
  supplier: { id: string; name: string } | null;
  /** Set on an ISSUE row — the stock-filled top-up that took these litres. */
  adBlueEntry: { id: string; entryDate: string; quantityLiters: number | null; location: string | null } | null;
  transactionDate: string;
  invoiceNumber: string | null;
  referenceNumber: string | null;
  remarks: string | null;
  fundAccountType: 'BANK' | 'CASH' | null;
  fundAccountId: string | null;
  createdAt: string;
}

export interface AdBlueVehicleUsageRow {
  vehicleId: string | null;
  registrationNumber: string;
  totalLiters: number;
  totalValue: number;
  transactionCount: number;
}

export interface AdBlueStockMovementTotal {
  quantityLiters: number;
  amount: number;
}

export interface AdBlueStockSummary {
  stockId: string;
  currentQuantityLiters: number;
  currentValue: number;
  averageRatePerLiter: number | null;
  purchased: AdBlueStockMovementTotal;
  issued: AdBlueStockMovementTotal;
  returned: AdBlueStockMovementTotal;
  adjusted: AdBlueStockMovementTotal;
  vehicleUsage: AdBlueVehicleUsageRow[];
}

export interface AdBlueEntry {
  id: string;
  source: AdBlueSource;
  location: string | null;
  quantityLiters: number | null;
  ratePerLiter: number | null;
  totalAmount: number | null;
  odometerReading: number | null;
  invoiceNumber: string | null;
  referenceNumber: string | null;
  remarks: string | null;
  entryDate: string;
  billDocument: string | null;
  vehicle: { id: string; registrationNumber: string };
  trip: { id: string; tripNumber: string } | null;
  driver: { id: string; name: string; code: string } | null;
  supplier: { id: string; name: string } | null;
  paymentMode: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdBlueSourceTotals {
  totalLiters: number;
  totalCost: number;
  entryCount: number;
}

export interface AdBlueSummary {
  totalLiters: number;
  totalCost: number;
  avgRate: number | null;
  entryCount: number;
  fromStock: AdBlueSourceTotals;
  directPurchase: AdBlueSourceTotals;
  lastEntry: string | null;
  from: string | null;
  to: string | null;
}

export interface VehicleAdBlueSummary extends AdBlueSummary {
  vehicleId: string;
  registrationNumber: string;
}

export interface AdBlueVehicleConsumptionRow {
  vehicleId: string;
  registrationNumber: string;
  totalLiters: number;
  totalCost: number;
  entryCount: number;
}
