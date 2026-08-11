import { prisma } from '../config/db';
import { vehicleFleetRepository } from '../repositories/vehicle-fleet.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { assertVehicleAccess, forcedVehicleOwnership } from '../utils/vehicleAccess';
import { UpdateVehicleStatusInput, UpdateComplianceInput } from '../validators/vehicle-fleet.validator';

// Mirrors TripProgress.vue's step order — used to turn a trip's current
// status into a rough completion percentage for the tracking card's progress bar.
const TRIP_STEPS = ['ASSIGNED', 'STARTED', 'LOADING', 'IN_TRANSIT', 'REACHED_DESTINATION', 'UNLOADING', 'COMPLETED'];

interface VehicleFleetRecord {
  id: string;
  registrationNumber: string;
  ownership: string;
  status: string;
  isActive: boolean;
  photo: string | null;
  fastagNumber: string | null;
  gpsDeviceNumber: string | null;
  rcExpiryDate: Date | null;
  insuranceExpiryDate: Date | null;
  permitExpiryDate: Date | null;
  fitnessExpiryDate: Date | null;
  fitnessDocument: string | null;
  pucExpiryDate: Date | null;
  pucDocument: string | null;
  vehicleType: { id: string; name: string } | null;
  supplier: { id: string; name: string } | null;
}

function serialize(vehicle: VehicleFleetRecord) {
  return {
    id: vehicle.id,
    registrationNumber: vehicle.registrationNumber,
    status: vehicle.status,
    isActive: vehicle.isActive,
    photo: vehicle.photo,
    fastagNumber: vehicle.fastagNumber,
    gpsDeviceNumber: vehicle.gpsDeviceNumber,
    rcExpiryDate: vehicle.rcExpiryDate,
    insuranceExpiryDate: vehicle.insuranceExpiryDate,
    permitExpiryDate: vehicle.permitExpiryDate,
    fitnessExpiryDate: vehicle.fitnessExpiryDate,
    fitnessDocument: vehicle.fitnessDocument,
    pucExpiryDate: vehicle.pucExpiryDate,
    pucDocument: vehicle.pucDocument,
    vehicleType: vehicle.vehicleType ? { id: vehicle.vehicleType.id, name: vehicle.vehicleType.name } : null,
    supplier: vehicle.supplier ? { id: vehicle.supplier.id, name: vehicle.supplier.name } : null,
  };
}

export const vehicleFleetService = {
  async getById(id: string, roles: string[] = []) {
    const vehicle = await vehicleFleetRepository.findById(id);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }
    assertVehicleAccess(vehicle.ownership, roles);
    return serialize(vehicle);
  },

  async checkAvailability(id: string, roles: string[] = []) {
    const vehicle = await vehicleFleetRepository.findById(id);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }
    assertVehicleAccess(vehicle.ownership, roles);

    const reasons: string[] = [];
    if (!vehicle.isActive) reasons.push('Vehicle is inactive');
    if (vehicle.status === 'UNDER_MAINTENANCE') reasons.push('Vehicle is under maintenance');
    if (vehicle.status === 'INACTIVE') reasons.push('Vehicle status is inactive');

    const activeAssignment = await vehicleFleetRepository.findActiveAssignment(id);
    if (activeAssignment) reasons.push('Vehicle is already assigned');

    const now = new Date();
    const expiredDocs: string[] = [];
    if (vehicle.insuranceExpiryDate && vehicle.insuranceExpiryDate < now) expiredDocs.push('Insurance');
    if (vehicle.permitExpiryDate && vehicle.permitExpiryDate < now) expiredDocs.push('Permit');
    if (vehicle.fitnessExpiryDate && vehicle.fitnessExpiryDate < now) expiredDocs.push('Fitness Certificate');
    if (vehicle.pucExpiryDate && vehicle.pucExpiryDate < now) expiredDocs.push('PUC');
    if (expiredDocs.length > 0) reasons.push(`Expired documents: ${expiredDocs.join(', ')}`);

    return {
      vehicleId: id,
      isAvailable: reasons.length === 0,
      reasons,
    };
  },

  async setStatus(id: string, input: UpdateVehicleStatusInput, actorId: string) {
    const vehicle = await vehicleFleetRepository.findById(id);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }

    await vehicleFleetRepository.setStatus(id, input.status, actorId);
    const updated = await vehicleFleetRepository.findById(id);
    if (!updated) {
      throw new AppError('Vehicle not found', 404);
    }

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Vehicle',
      entityId: id,
      description: `Changed status of vehicle ${vehicle.registrationNumber} to ${input.status}`,
    });

    return serialize(updated);
  },

  async updateCompliance(id: string, input: UpdateComplianceInput, actorId: string) {
    const vehicle = await vehicleFleetRepository.findById(id);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }

    if (input.fastagNumber && input.fastagNumber !== vehicle.fastagNumber) {
      const taken = await vehicleFleetRepository.findByFastag(input.fastagNumber);
      if (taken) throw new AppError('FASTag number already in use', 409);
    }
    if (input.gpsDeviceNumber && input.gpsDeviceNumber !== vehicle.gpsDeviceNumber) {
      const taken = await vehicleFleetRepository.findByGps(input.gpsDeviceNumber);
      if (taken) throw new AppError('GPS device number already in use', 409);
    }

    await vehicleFleetRepository.updateCompliance(
      id,
      {
        fastagNumber: input.fastagNumber,
        gpsDeviceNumber: input.gpsDeviceNumber,
        rcExpiryDate: input.rcExpiryDate ? new Date(input.rcExpiryDate) : undefined,
        insuranceExpiryDate: input.insuranceExpiryDate ? new Date(input.insuranceExpiryDate) : undefined,
        permitExpiryDate: input.permitExpiryDate ? new Date(input.permitExpiryDate) : undefined,
        fitnessExpiryDate: input.fitnessExpiryDate ? new Date(input.fitnessExpiryDate) : undefined,
        pucExpiryDate: input.pucExpiryDate ? new Date(input.pucExpiryDate) : undefined,
      },
      actorId
    );

    const updated = await vehicleFleetRepository.findById(id);
    if (!updated) {
      throw new AppError('Vehicle not found', 404);
    }

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Vehicle',
      entityId: id,
      description: `Updated compliance details for vehicle ${vehicle.registrationNumber}`,
    });

    return serialize(updated);
  },

  async setDocument(id: string, field: 'photo' | 'fitnessDocument' | 'pucDocument', filePath: string, actorId: string) {
    const vehicle = await vehicleFleetRepository.findById(id);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }

    await vehicleFleetRepository.setDocument(id, field, filePath, actorId);
    const updated = await vehicleFleetRepository.findById(id);
    if (!updated) {
      throw new AppError('Vehicle not found', 404);
    }

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Vehicle',
      entityId: id,
      description: `Uploaded ${field} for vehicle ${vehicle.registrationNumber}`,
    });

    return serialize(updated);
  },

  async timeline(id: string, roles: string[] = []) {
    const vehicle = await vehicleFleetRepository.findById(id);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }
    assertVehicleAccess(vehicle.ownership, roles);

    const [assignments, fuelEntries, maintenanceRecords, expenses, auditLogs] = await Promise.all([
      prisma.vehicleAssignment.findMany({
        where: { vehicleId: id },
        include: { driver: true },
        orderBy: { assignedAt: 'desc' },
      }),
      prisma.fuelEntry.findMany({ where: { vehicleId: id, deletedAt: null }, orderBy: { entryDate: 'desc' } }),
      prisma.maintenanceRecord.findMany({ where: { vehicleId: id, deletedAt: null }, orderBy: { serviceDate: 'desc' } }),
      prisma.vehicleExpense.findMany({ where: { vehicleId: id, deletedAt: null }, orderBy: { expenseDate: 'desc' } }),
      prisma.auditLog.findMany({ where: { entityType: 'Vehicle', entityId: id }, orderBy: { createdAt: 'desc' }, take: 50 }),
    ]);

    const events = [
      ...assignments.map((a) => ({
        type: 'ASSIGNMENT' as const,
        date: a.assignedAt,
        description: `Assigned to driver ${a.driver.name}`,
        status: a.status,
      })),
      ...fuelEntries.map((f) => ({
        type: 'FUEL' as const,
        date: f.entryDate,
        description: `Fuel entry: ${f.quantityLiters}L for ${f.totalAmount}`,
      })),
      ...maintenanceRecords.map((m) => ({
        type: 'MAINTENANCE' as const,
        date: m.serviceDate,
        description: `${m.type}: ${m.description}`,
        status: m.status,
      })),
      ...expenses.map((e) => ({
        type: 'EXPENSE' as const,
        date: e.expenseDate,
        description: `${e.category} expense: ${e.amount}`,
      })),
      ...auditLogs.map((l) => ({
        type: 'AUDIT' as const,
        date: l.createdAt,
        description: l.description || l.action,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return events;
  },

  async trackingList(roles: string[] = []) {
    const ownership = forcedVehicleOwnership(roles);
    const vehicles = await prisma.vehicle.findMany({
      where: { deletedAt: null, ...(ownership ? { ownership } : {}) },
      orderBy: { registrationNumber: 'asc' },
    });
    const vehicleIds = vehicles.map((v) => v.id);
    if (vehicleIds.length === 0) return [];

    const [activeTrips, completedTrips, activeAssignments] = await Promise.all([
      prisma.trip.findMany({
        where: { vehicleId: { in: vehicleIds }, deletedAt: null, status: { notIn: ['COMPLETED', 'CANCELLED', 'DRAFT'] } },
        include: { driver: true, fromLocation: true, toLocation: true },
      }),
      prisma.trip.findMany({
        where: { vehicleId: { in: vehicleIds }, deletedAt: null, status: 'COMPLETED' },
        include: { toLocation: true },
        orderBy: { actualEndDate: 'desc' },
      }),
      prisma.vehicleAssignment.findMany({
        where: { vehicleId: { in: vehicleIds }, status: 'ACTIVE' },
        include: { driver: true },
      }),
    ]);

    const activeTripByVehicle = new Map(activeTrips.map((t) => [t.vehicleId as string, t]));
    // completedTrips is already ordered newest-first, so the first one seen per vehicle wins.
    const lastCompletedByVehicle = new Map<string, (typeof completedTrips)[number]>();
    for (const t of completedTrips) {
      const vehicleId = t.vehicleId as string;
      if (!lastCompletedByVehicle.has(vehicleId)) lastCompletedByVehicle.set(vehicleId, t);
    }
    const activeAssignmentByVehicle = new Map(activeAssignments.map((a) => [a.vehicleId, a]));

    return vehicles.map((vehicle) => {
      const activeTrip = activeTripByVehicle.get(vehicle.id);
      const lastCompleted = lastCompletedByVehicle.get(vehicle.id);
      const assignment = activeAssignmentByVehicle.get(vehicle.id);

      const trackingStatus: 'ON_TRIP' | 'AVAILABLE' | 'UNAVAILABLE' = activeTrip
        ? 'ON_TRIP'
        : !vehicle.isActive || vehicle.status === 'UNDER_MAINTENANCE' || vehicle.status === 'INACTIVE'
        ? 'UNAVAILABLE'
        : 'AVAILABLE';

      return {
        id: vehicle.id,
        registrationNumber: vehicle.registrationNumber,
        ownership: vehicle.ownership,
        status: vehicle.status,
        isActive: vehicle.isActive,
        trackingStatus,
        driverName: activeTrip?.driver?.name || assignment?.driver?.name || null,
        // No GPS integration — location is derived from the trip route: the
        // destination of an in-progress trip, or where the vehicle ended up
        // after its last completed trip.
        currentLocation: activeTrip ? activeTrip.toLocation.name : lastCompleted?.toLocation.name || null,
        activeTrip: activeTrip
          ? {
              tripNumber: activeTrip.tripNumber,
              fromLocation: activeTrip.fromLocation.name,
              toLocation: activeTrip.toLocation.name,
              status: activeTrip.status,
              progressPercent: Math.round(
                ((TRIP_STEPS.indexOf(activeTrip.status) + 1) / TRIP_STEPS.length) * 100
              ),
            }
          : null,
        idleSince: !activeTrip ? lastCompleted?.actualEndDate || null : null,
        lastCompletedTripNumber: lastCompleted?.tripNumber || null,
      };
    });
  },
};