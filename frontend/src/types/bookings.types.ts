export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'VEHICLE_ASSIGNED'
  | 'LR_GENERATED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED';

/** Delivery stages an admin can advance a dispatched booking through. */
export type DeliveryStatus = 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED';

export type FleetType = 'OWN' | 'MARKET';

/** How the consignment moves — printed on the LR's vehicle strip. */
export type LrTransportMode = 'ROAD' | 'RAIL' | 'AIR' | 'SEA';

/** Who settles the freight, and when. */
export type LrFreightPayment = 'TO_PAY' | 'PAID' | 'TO_BE_BILLED';

/** Which side of the consignment a commercial role sits on. */
export type LrParty = 'CONSIGNOR' | 'CONSIGNEE' | 'THIRD_PARTY';

/** One row of the LR's goods table, as stored. */
export interface BookingGoodsItem {
  id: string;
  invoiceNo: string | null;
  invoiceDate: string | null;
  description: string;
  units: number;
  goodsValue: string | number;
  ewayBillNo: string | null;
  ewayBillDate: string | null;
}

/** One row of the LR's goods table, as edited and submitted. */
export interface GoodsItemPayload {
  invoiceNo?: string;
  invoiceDate?: string;
  description: string;
  units: number;
  goodsValue: number;
  ewayBillNo?: string;
  ewayBillDate?: string;
}

/**
 * Everything the printed LR carries beyond the booking itself. Saved in one
 * go, so every field the form owns is sent on every save — a blank field
 * clears the stored value rather than leaving it be.
 */
export interface LrDetailsPayload {
  /** Auto-issued at confirmation; sent back only when the operator overrides it. */
  lrNumber?: string;
  consignorGstin?: string;
  consigneeName?: string;
  consigneeAddress?: string;
  consigneePhone?: string;
  consigneeGstin?: string;
  transportMode?: LrTransportMode | null;
  paymentTerm?: string;
  dispatchAt?: string;
  freightCharges?: number | null;
  loadingCharges?: number | null;
  unloadingCharges?: number | null;
  otherCharges?: number | null;
  freightPayment?: LrFreightPayment | null;
  billingParty?: LrParty | null;
  freightPayer?: LrParty | null;
  advanceReceived?: number | null;
  remarks?: string;
  goodsItems?: GoodsItemPayload[];
}

/** Which channel the booking arrived through. */
export type BookingSource = 'WEBSITE' | 'COUNTER';

/**
 * Payload for a booking keyed in by staff. Every field is optional — a phone
 * booking often starts as a name and a destination, and the rest arrives
 * later. The public website form is stricter; see the backend validator.
 */
export interface CounterBookingPayload {
  customerName?: string;
  mobile?: string;
  email?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  fromLocationId?: string;
  toLocationId?: string;
  parcelType?: string;
  packages?: number | null;
  weight?: number | null;
  vehicleType?: string;
  pickupDate?: string;
  expectedDeliveryDate?: string;
  freightAmount?: number | null;
  instructions?: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface BookingStatusHistoryEntry {
  id: string;
  status: BookingStatus;
  statusLabel: string;
  note: string | null;
  createdAt: string;
}

export interface Booking {
  id: string;
  bookingNo: string;
  status: BookingStatus;
  statusLabel: string;
  source: BookingSource;
  /** Agreed price — counter bookings only; the website does not quote. */
  freightAmount: string | number | null;

  // All optional on the record: a booking can be saved with nothing but a
  // name, and completed as the details arrive. Null means "not known yet".
  customerName: string | null;
  mobile: string | null;
  email: string | null;
  pickupAddress: string | null;
  deliveryAddress: string | null;

  fromPlace: string | null;
  toPlace: string | null;
  parcelType: string | null;
  packages: number | null;
  weight: string | number | null;
  vehicleTypeRequested: string | null;
  pickupDate: string | null;
  expectedDeliveryDate: string | null;
  instructions: string | null;

  lrNumber: string | null;
  trackingNumber: string | null;
  lrGeneratedAt: string | null;
  deliveredAt: string | null;
  rejectionReason: string | null;

  // ----- Printed LR detail -----------------------------------------------
  consignorGstin: string | null;
  consigneeName: string | null;
  consigneeAddress: string | null;
  consigneePhone: string | null;
  consigneeGstin: string | null;
  transportMode: LrTransportMode | null;
  paymentTerm: string | null;
  dispatchAt: string | null;
  freightCharges: string | number | null;
  loadingCharges: string | number | null;
  unloadingCharges: string | number | null;
  otherCharges: string | number | null;
  freightPayment: LrFreightPayment | null;
  billingParty: LrParty | null;
  freightPayer: LrParty | null;
  advanceReceived: string | number | null;
  remarks: string | null;
  goodsItems: BookingGoodsItem[];
  /** False once the booking is dispatched — the LR is then fixed. */
  lrEditable: boolean;

  fleetType: FleetType | null;
  vehicleNumber: string | null;
  vehicleTypeName: string | null;
  driverName: string | null;
  driverMobile: string | null;
  vehicle: { id: string; registrationNumber: string } | null;
  driver: { id: string; name: string; phone: string | null } | null;

  /** Route mapped onto the Location master when the booking was confirmed. */
  fromLocation: { id: string; name: string } | null;
  toLocation: { id: string; name: string } | null;
  /** Name-match hints used to pre-select the confirm screen's route dropdowns. */
  suggestedFromLocationId?: string | null;
  suggestedToLocationId?: string | null;

  statusHistory: BookingStatusHistoryEntry[];

  createdAt: string;
  updatedAt: string;
}

export interface BookingStats {
  total: number;
  PENDING: number;
  CONFIRMED: number;
  REJECTED: number;
  VEHICLE_ASSIGNED: number;
  LR_GENERATED: number;
  PICKED_UP: number;
  IN_TRANSIT: number;
  OUT_FOR_DELIVERY: number;
  DELIVERED: number;
}

export interface AssignVehiclePayload {
  fleetType: FleetType;
  vehicleId?: string;
  driverId?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverMobile?: string;
}
