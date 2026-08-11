import type { PaginationMeta } from './admin.types';

export type IntentStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'CONVERTED' | 'REJECTED' | 'CANCELLED';
export type LoadMode = 'FULL' | 'PART';
export type TripStatus =
  | 'DRAFT'
  | 'PLANNED'
  | 'APPROVED'
  | 'ASSIGNED'
  | 'STARTED'
  | 'LOADING'
  | 'IN_TRANSIT'
  | 'REACHED_DESTINATION'
  | 'UNLOADING'
  | 'COMPLETED'
  | 'CANCELLED';
export type PodStatus = 'PENDING' | 'UPLOADED' | 'VERIFIED';
export type TripDocumentType = 'POD' | 'LR_COPY' | 'INVOICE_COPY' | 'DELIVERY_PROOF' | 'OTHER';
export type TripDocumentStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type TripExpenseCategory = 'FUEL' | 'DRIVER_BATA' | 'TOLL' | 'LOADING' | 'UNLOADING' | 'MISCELLANEOUS';
export type FleetType = 'OWN' | 'MARKET';

export interface Intent {
  id: string;
  intentNumber: string;
  status: IntentStatus;
  quantityTon: number | null;
  expectedPickupDate: string | null;
  expectedDeliveryDate: string | null;
  freightAmount: number | null;
  opsAmount: number | null;
  fleetType: FleetType | null;
  remarks: string | null;
  rejectionReason: string | null;
  approvedAt: string | null;
  isActive: boolean;
  poNumber: string | null;
  packages: number | null;
  volumeCbm: number | null;
  loadMode: LoadMode;
  podRequired: boolean;
  insuranceRequired: boolean;
  baseFreightAmount: number | null;
  tollCharges: number | null;
  loadingCharges: number | null;
  otherCharges: number | null;
  company: { id: string; name: string };
  fromLocation: { id: string; name: string };
  toLocation: { id: string; name: string };
  material: { id: string; name: string } | null;
  vehicleType: { id: string; name: string } | null;
  createdBy: { id: string; fullName: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntentStats {
  total: number;
  DRAFT: number;
  SUBMITTED: number;
  APPROVED: number;
  CONVERTED: number;
  REJECTED: number;
  CANCELLED: number;
}

export interface TripStats {
  total: number;
  DRAFT: number;
  PLANNED: number;
  APPROVED: number;
  ASSIGNED: number;
  STARTED: number;
  LOADING: number;
  IN_TRANSIT: number;
  REACHED_DESTINATION: number;
  UNLOADING: number;
  COMPLETED: number;
  CANCELLED: number;
}

export interface AvailableVehicle {
  id: string;
  registrationNumber: string;
  ownership: 'OWN' | 'MARKET';
}

export interface AvailableDriver {
  id: string;
  name: string;
  phone: string | null;
}

export interface Trip {
  id: string;
  tripNumber: string;
  status: TripStatus;
  freightAmount: number | null;
  supplierRate: number | null;
  marketVehicleNumber: string | null;
  marketDriverName: string | null;
  marketDriverContact: string | null;
  loadWeight: number | null;
  loadDescription: string | null;
  scheduledStartDate: string | null;
  actualStartDate: string | null;
  expectedDeliveryDate: string | null;
  actualEndDate: string | null;
  podRequired: boolean;
  podStatus: PodStatus;
  cancelReason: string | null;
  fleetType: FleetType | null;
  isDelayed: boolean;
  isActive: boolean;
  invoiceId: string | null;
  invoice: { id: string; invoiceNumber: string } | null;
  intent: {
    id: string;
    intentNumber: string;
    company: { id: string; name: string };
    material: { id: string; name: string } | null;
    vehicleType: { id: string; name: string } | null;
    quantityTon: number | null;
    loadMode: LoadMode;
    opsAmount: number | null;
  };
  vehicle: { id: string; registrationNumber: string; ownership: 'OWN' | 'MARKET' } | null;
  driver: { id: string; name: string; phone: string | null } | null;
  supplier: { id: string; name: string } | null;
  route: { id: string; name: string } | null;
  fromLocation: { id: string; name: string };
  toLocation: { id: string; name: string };
  createdBy: { id: string; fullName: string } | null;
  assignedBy: { id: string; fullName: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface TripStatusHistoryEntry {
  id: string;
  tripId: string;
  status: TripStatus;
  notes: string | null;
  changedAt: string;
}

export interface TripDocument {
  id: string;
  tripId: string;
  type: TripDocumentType;
  fileUrl: string;
  remarks: string | null;
  status: TripDocumentStatus;
  verifiedAt: string | null;
  createdAt: string;
}

export interface TripNote {
  id: string;
  tripId: string;
  note: string;
  author: { id: string; fullName: string } | null;
  createdAt: string;
}

export interface TripExpense {
  id: string;
  category: TripExpenseCategory;
  amount: number;
  expenseDate: string;
  description: string | null;
  billDocument: string | null;
  trip: { id: string; tripNumber: string };
  createdAt: string;
  updatedAt: string;
}

export interface OperationsDashboardSummary {
  intentSummary: { pending: number; approved: number };
  tripSummary: { planned: number; running: number; completed: number; delayed: number };
  fleetMixSummary: { supplierTrips: number; ownFleetTrips: number };
  revenueSummary: { month: string; totalFreightRevenue: number };
  delayedTrips: { id: string; tripNumber: string; status: TripStatus; expectedDeliveryDate: string | null }[];
}

export type { PaginationMeta };
