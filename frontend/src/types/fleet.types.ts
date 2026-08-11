import type { PaginationMeta } from './admin.types';

export type VehicleStatus = 'AVAILABLE' | 'RUNNING' | 'UNDER_MAINTENANCE' | 'INACTIVE';
export type AssignmentStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type MaintenanceType = 'SERVICE' | 'REPAIR' | 'BREAKDOWN' | 'ACCIDENT';
export type MaintenanceStatus = 'OPEN' | 'COMPLETED';
export type SparePartUsageType = 'ISSUE' | 'RETURN';
// Phase 12 — Vehicle Assets, Loans & Expense Management (docs Phase 6)
// extends the original five values additively.
export type VehicleExpenseCategory =
  | 'FUEL' | 'MAINTENANCE' | 'INSURANCE' | 'PERMIT' | 'MISCELLANEOUS'
  | 'REPAIR' | 'SERVICE' | 'TYRE' | 'BATTERY' | 'FITNESS' | 'ROAD_TAX' | 'FASTTAG' | 'ACCESSORIES' | 'GREASE_LUBRICANTS' | 'BREAKDOWN';
export type VehicleExpenseApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type FuelType = 'DIESEL' | 'PETROL' | 'CNG' | 'OTHER';

export interface FleetVehicle {
  id: string;
  registrationNumber: string;
  status: VehicleStatus;
  isActive: boolean;
  photo: string | null;
  fastagNumber: string | null;
  gpsDeviceNumber: string | null;
  rcExpiryDate: string | null;
  insuranceExpiryDate: string | null;
  permitExpiryDate: string | null;
  fitnessExpiryDate: string | null;
  fitnessDocument: string | null;
  pucExpiryDate: string | null;
  pucDocument: string | null;
  vehicleType: { id: string; name: string } | null;
  supplier: { id: string; name: string } | null;
}

export interface VehicleAvailability {
  vehicleId: string;
  isAvailable: boolean;
  reasons: string[];
}

export interface VehicleTracking {
  id: string;
  registrationNumber: string;
  ownership: 'OWN' | 'MARKET';
  status: VehicleStatus;
  isActive: boolean;
  trackingStatus: 'ON_TRIP' | 'AVAILABLE' | 'UNAVAILABLE';
  driverName: string | null;
  currentLocation: string | null;
  activeTrip: {
    tripNumber: string;
    fromLocation: string;
    toLocation: string;
    status: string;
    progressPercent: number;
  } | null;
  idleSince: string | null;
  lastCompletedTripNumber: string | null;
}

export interface VehicleAssignment {
  id: string;
  status: AssignmentStatus;
  assignedAt: string;
  unassignedAt: string | null;
  notes: string | null;
  vehicle: { id: string; registrationNumber: string };
  driver: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export type FuelBillingMethod = 'FUEL_CARD' | 'OTP' | 'DIRECT_PAYMENT';

export interface FuelEntry {
  id: string;
  fuelType: FuelType;
  billingMethod: FuelBillingMethod | null;
  location: string | null;
  quantityLiters: number;
  ratePerLiter: number;
  totalAmount: number;
  odometerReading: number;
  distanceCovered: number | null;
  mileageKmpl: number | null;
  invoiceNumber: string | null;
  referenceNumber: string | null;
  remarks: string | null;
  isAnomaly: boolean;
  anomalyReasons: string | null;
  entryDate: string;
  billDocument: string | null;
  vehicle: { id: string; registrationNumber: string };
  fuelStation: { id: string; name: string } | null;
  fuelCard: { id: string; cardNumber: string } | null;
  trip: { id: string; tripNumber: string } | null;
  driver: { id: string; name: string; code: string } | null;
  supplier: { id: string; name: string } | null;
  paymentMode: { id: string; name: string } | null;
  advance: { id: string; advanceNumber: string; amount: number } | null;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleFuelSummary {
  vehicleId: string;
  registrationNumber: string;
  totalLiters: number;
  totalFuelCost: number;
  avgRate: number | null;
  totalKM: number;
  mileageKmpl: number | null;
  costPerKm: number | null;
  fuelCostPerKm: number | null;
  lastFuelEntry: string | null;
  currentOdometer: number | null;
  entryCount: number;
}

export interface FuelAdvanceBalance {
  advanceId: string;
  advanceNumber: string;
  advanceAmount: number;
  fuelUsed: number;
  remaining: number;
}

export interface MaintenanceRecord {
  id: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  description: string;
  serviceDate: string;
  cost: number | null;
  odometerReading: number | null;
  nextServiceDueDate: string | null;
  nextServiceDueOdometer: number | null;
  billDocument: string | null;
  accidentPhoto: string | null;
  vehicle: { id: string; registrationNumber: string };
  serviceCategory: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface SparePartUsage {
  id: string;
  type: SparePartUsageType;
  quantity: number;
  usageDate: string;
  notes: string | null;
  vehicle: { id: string; registrationNumber: string };
  sparePart: { id: string; name: string; code: string };
  maintenanceRecord: { id: string; type: string } | null;
  createdAt: string;
}

export interface VehicleExpense {
  id: string;
  category: VehicleExpenseCategory;
  amount: number;
  taxAmount: number | null;
  totalAmount: number | null;
  expenseDate: string;
  description: string | null;
  billDocument: string | null;
  referenceType: string | null;
  referenceId: string | null;
  approvalStatus: VehicleExpenseApprovalStatus;
  vehicle: { id: string; registrationNumber: string };
  paymentMode: { id: string; name: string } | null;
  trip: { id: string; tripNumber: string } | null;
  supplier: { id: string; name: string } | null;
  gstMaster: { id: string; name: string; ratePercent: number } | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierVehicle {
  id: string;
  registrationNumber: string;
  status: VehicleStatus;
  isActive: boolean;
  manufacturer: string | null;
  model: string | null;
  vehicleType: { id: string; name: string } | null;
  supplier: { id: string; name: string } | null;
  activeAssignment: { driver: string; assignedAt: string } | null;
}

export interface FleetDashboardSummary {
  fleetSummary: { totalVehicles: number; ownVehicles: number; marketVehicles: number };
  statusSummary: { available: number; running: number; underMaintenance: number; inactive: number };
  costSummary: {
    month: string;
    fuelCost: number;
    maintenanceCost: number;
    byCategory: { category: string; total: number }[];
  };
  documentExpirySummary: {
    vehicleId: string;
    registrationNumber: string;
    insuranceExpiryDate: string | null;
    permitExpiryDate: string | null;
    fitnessExpiryDate: string | null;
    pucExpiryDate: string | null;
  }[];
}

export interface TimelineEvent {
  type: 'ASSIGNMENT' | 'FUEL' | 'MAINTENANCE' | 'EXPENSE' | 'AUDIT';
  date: string;
  description: string;
  status?: string;
}

export type { PaginationMeta };
