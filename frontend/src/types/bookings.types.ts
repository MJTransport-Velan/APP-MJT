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

/** Which channel the booking arrived through. */
export type BookingSource = 'WEBSITE' | 'COUNTER';

/** Payload for a booking keyed in by staff. */
export interface CounterBookingPayload {
  customerName: string;
  mobile: string;
  email?: string;
  pickupAddress: string;
  deliveryAddress: string;
  fromLocationId: string;
  toLocationId: string;
  parcelType: string;
  packages: number;
  weight: number;
  vehicleType: string;
  pickupDate: string;
  expectedDeliveryDate?: string;
  freightAmount?: number;
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

  customerName: string;
  mobile: string;
  email: string | null;
  pickupAddress: string;
  deliveryAddress: string;

  fromPlace: string;
  toPlace: string;
  parcelType: string;
  packages: number;
  weight: string | number;
  vehicleTypeRequested: string;
  pickupDate: string;
  expectedDeliveryDate: string | null;
  instructions: string | null;

  lrNumber: string | null;
  trackingNumber: string | null;
  lrGeneratedAt: string | null;
  deliveredAt: string | null;
  rejectionReason: string | null;

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
