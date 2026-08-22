import { Request } from 'express';
import { TripStatus } from '@prisma/client';
import { tripRepository, TripWithRelations } from '../repositories/trip.repository';
import { intentRepository } from '../repositories/intent.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { receiptService } from './receipt.service';
import { supplierPaymentService } from './supplier-payment.service';
import { vehicleAssignmentService } from './vehicle-assignment.service';
import { driverSalaryStructureService } from './driver-salary-structure.service';
import { vehicleExpenseInternalService } from './vehicle-expense.service';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { forcedVehicleOwnership, assertVehicleAccess } from '../utils/vehicleAccess';
import { forcedCompanyScope } from '../utils/groupAccess';
import {
  CreateTripInput,
  UpdateTripInput,
  AssignTripInput,
  AllocateAssetInput,
} from '../validators/trip.validator';

// Forward-only workflow; CANCELLED is reachable from every non-terminal status.
const ALLOWED_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  DRAFT: ['PLANNED', 'CANCELLED'],
  PLANNED: ['APPROVED', 'CANCELLED'],
  APPROVED: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['STARTED', 'CANCELLED'],
  STARTED: ['LOADING', 'CANCELLED'],
  LOADING: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['REACHED_DESTINATION', 'CANCELLED'],
  REACHED_DESTINATION: ['UNLOADING', 'CANCELLED'],
  UNLOADING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

// Fleet operators may only reach trips routed to their own team. A trip
// explicitly routed by fleetType (set at intent approval) is checked against
// that; a legacy trip (fleetType null, predates this field) falls back to
// checking the actual assigned vehicle's ownership, and stays visible to
// both fleet-operator roles while unassigned — ownership isn't decided until
// assignment, and that unassigned state is exactly their queue of work to
// pick up.
function assertTripVehicleAccess(trip: TripWithRelations, roles: string[]) {
  const forced = forcedVehicleOwnership(roles);
  if (!forced) return;
  if (trip.fleetType) {
    if (trip.fleetType !== forced) {
      throw new AppError('You do not have access to this trip', 403);
    }
    return;
  }
  if (trip.vehicle && trip.vehicle.ownership !== forced) {
    throw new AppError('You do not have access to this trip', 403);
  }
}

// This trip's team routing (Intent.fleetType, copied at Trip creation) must
// match the kind of asset being allocated — a trip approved for the Own
// Vehicle team can't be given a market truck and vice versa. Legacy trips
// (fleetType null, predate this field) have no routing to enforce.
function assertFleetTypeMatch(trip: TripWithRelations, allocationType: 'OWN_FLEET' | 'MARKET_TRUCK') {
  if (!trip.fleetType) return;
  const expected = trip.fleetType === 'OWN' ? 'OWN_FLEET' : 'MARKET_TRUCK';
  if (allocationType !== expected) {
    const teamName = trip.fleetType === 'OWN' ? 'Own Vehicle' : 'Market Vehicle';
    const assetName = allocationType === 'OWN_FLEET' ? 'an own fleet vehicle' : 'a market truck';
    throw new AppError(`This trip was approved for the ${teamName} team and cannot be allocated ${assetName}`, 400);
  }
}

// Own-fleet trips only (vehicleId+driverId) — market trucks pay via
// supplierRate/settlement, not a Driver salary structure, so callers must
// check both before invoking this. Posted once at trip completion since a
// COMPLETED trip can never be edited or re-completed (see
// ALLOWED_TRANSITIONS: COMPLETED has no outgoing transitions), so there is
// no later edit/delete path to keep this mirror in sync with.
async function postDriverSalaryExpense(trip: TripWithRelations, completedAt: Date, actorId: string) {
  const salary = await driverSalaryStructureService.computeForTrip(trip.driverId as string, {
    freightAmount: trip.freightAmount ? Number(trip.freightAmount) : null,
    actualStartDate: trip.actualStartDate,
    actualEndDate: completedAt,
  });
  if (!salary || salary.amount <= 0) return;

  await vehicleExpenseInternalService.logFromSource({
    vehicleId: trip.vehicleId as string,
    tripId: trip.id,
    category: 'DRIVER_SALARY',
    amount: salary.amount,
    expenseDate: completedAt,
    description: `Driver salary for trip ${trip.tripNumber}: ${salary.description}`,
    referenceType: 'TripDriverSalary',
    referenceId: trip.id,
    actorId,
  });
}

// OWN_FLEET_OPERATOR may only allocate own-fleet vehicles; MARKET_FLEET_OPERATOR
// may only allocate market trucks. Everyone else (managers/admins) can do both.
function assertAllocationTypeAccess(allocationType: 'OWN_FLEET' | 'MARKET_TRUCK', roles: string[]) {
  const forced = forcedVehicleOwnership(roles);
  if (forced === 'MARKET' && allocationType === 'OWN_FLEET') {
    throw new AppError('Market fleet operators can only allocate market trucks', 403);
  }
  if (forced === 'OWN' && allocationType === 'MARKET_TRUCK') {
    throw new AppError('Own fleet operators can only allocate own fleet vehicles', 403);
  }
}

// Group-scoped roles (fleet operators, accounts executives) may only reach
// trips whose intent belongs to a company in their own group.
async function assertTripCompanyAccess(trip: TripWithRelations, roles: string[], userId: string) {
  const scope = await forcedCompanyScope(roles, userId);
  if (scope === undefined) return;
  if (!scope.includes(trip.intent.companyId)) {
    throw new AppError('You do not have access to this trip', 403);
  }
}

function serialize(trip: TripWithRelations) {
  const isDelayed =
    !!trip.expectedDeliveryDate &&
    trip.status !== 'COMPLETED' &&
    trip.status !== 'CANCELLED' &&
    new Date(trip.expectedDeliveryDate) < new Date();

  return {
    id: trip.id,
    tripNumber: trip.tripNumber,
    status: trip.status,
    freightAmount: trip.freightAmount,
    loadingCharges: trip.loadingCharges,
    unloadingCharges: trip.unloadingCharges,
    supplierRate: trip.supplierRate,
    marketVehicleNumber: trip.marketVehicleNumber,
    marketDriverName: trip.marketDriverName,
    marketDriverContact: trip.marketDriverContact,
    loadWeight: trip.loadWeight,
    loadDescription: trip.loadDescription,
    scheduledStartDate: trip.scheduledStartDate,
    actualStartDate: trip.actualStartDate,
    expectedDeliveryDate: trip.expectedDeliveryDate,
    actualEndDate: trip.actualEndDate,
    podRequired: trip.podRequired,
    podStatus: trip.podStatus,
    cancelReason: trip.cancelReason,
    fleetType: trip.fleetType,
    isDelayed,
    isActive: trip.isActive,
    invoiceId: trip.invoiceId,
    invoice: trip.invoice ? { id: trip.invoice.id, invoiceNumber: trip.invoice.invoiceNumber } : null,
    intent: {
      id: trip.intent.id,
      intentNumber: trip.intent.intentNumber,
      company: { id: trip.intent.company.id, name: trip.intent.company.name },
      material: trip.intent.material ? { id: trip.intent.material.id, name: trip.intent.material.name } : null,
      vehicleType: trip.intent.vehicleType ? { id: trip.intent.vehicleType.id, name: trip.intent.vehicleType.name } : null,
      quantityTon: trip.intent.quantityTon,
      loadMode: trip.intent.loadMode,
      opsAmount: trip.intent.opsAmount,
    },
    vehicle: trip.vehicle
      ? { id: trip.vehicle.id, registrationNumber: trip.vehicle.registrationNumber, ownership: trip.vehicle.ownership }
      : null,
    driver: trip.driver ? { id: trip.driver.id, name: trip.driver.name, phone: trip.driver.phone } : null,
    supplier: trip.supplier ? { id: trip.supplier.id, name: trip.supplier.name } : null,
    fromLocation: { id: trip.fromLocation.id, name: trip.fromLocation.name },
    toLocation: { id: trip.toLocation.id, name: trip.toLocation.name },
    createdBy: trip.createdBy ? { id: trip.createdBy.id, fullName: trip.createdBy.fullName } : null,
    assignedBy: trip.assignedBy ? { id: trip.assignedBy.id, fullName: trip.assignedBy.fullName } : null,
    createdAt: trip.createdAt,
    updatedAt: trip.updatedAt,
  };
}

export const tripService = {
  async list(query: Request['query'], roles: string[] = [], userId?: string) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const search = (query.search as string) || undefined;
    const intentId = (query.intentId as string) || undefined;
    const vehicleId = (query.vehicleId as string) || undefined;
    const driverId = (query.driverId as string) || undefined;
    const supplierId = (query.supplierId as string) || undefined;
    const status = (query.status as TripStatus) || undefined;
    const statusIn = (query.statusIn as string)
      ? ((query.statusIn as string).split(',') as TripStatus[])
      : undefined;
    // OWN_FLEET_OPERATOR/MARKET_FLEET_OPERATOR are locked to their own team's
    // queue (see tripRepository.ownershipWhere — trips routed by fleetType at
    // intent approval, with a legacy fallback for pre-existing trips). Within
    // that queue, unassigned (APPROVED) trips stay visible to the whole team,
    // but once a trip is assigned it should only keep showing for whoever
    // actually assigned it — forcedAssignedUserId narrows on top of, not
    // instead of, the ownership filter.
    const forcedOwnership = forcedVehicleOwnership(roles);
    const forcedAssignedUserId = forcedOwnership && userId ? userId : undefined;
    // Fleet operators are locked to trips run on their own ownership's
    // vehicles regardless of what the client passes (mirrors vehicle.service.ts).
    const vehicleOwnership = forcedOwnership || (query.vehicleOwnership as 'OWN' | 'MARKET') || undefined;
    const dateFrom = query.dateFrom ? new Date(query.dateFrom as string) : undefined;
    const dateTo = query.dateTo ? new Date(query.dateTo as string) : undefined;
    // Group-scoped roles only ever see trips for companies in their own group.
    const companyIds = userId ? await forcedCompanyScope(roles, userId) : undefined;

    const { rows, total } = await tripRepository.findManyPaginated({
      skip,
      take,
      search,
      intentId,
      vehicleId,
      driverId,
      supplierId,
      status,
      statusIn,
      vehicleOwnership,
      forcedAssignedUserId,
      dateFrom,
      dateTo,
      companyIds,
    });

    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string, roles: string[] = [], userId?: string) {
    const trip = await tripRepository.findById(id);
    if (!trip) {
      throw new AppError('Trip not found', 404);
    }
    assertTripVehicleAccess(trip, roles);
    if (userId) {
      await assertTripCompanyAccess(trip, roles, userId);
    }
    return serialize(trip);
  },

  async stats(roles: string[] = [], userId?: string) {
    const forcedOwnership = forcedVehicleOwnership(roles);
    const forcedAssignedUserId = forcedOwnership && userId ? userId : undefined;
    const vehicleOwnership = forcedOwnership;
    const companyIds = userId ? await forcedCompanyScope(roles, userId) : undefined;
    const groups = await tripRepository.countsByStatus(vehicleOwnership, companyIds, forcedAssignedUserId);
    const counts: Record<string, number> = {
      DRAFT: 0,
      PLANNED: 0,
      APPROVED: 0,
      ASSIGNED: 0,
      STARTED: 0,
      LOADING: 0,
      IN_TRANSIT: 0,
      REACHED_DESTINATION: 0,
      UNLOADING: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };
    let total = 0;
    for (const g of groups) {
      counts[g.status] = g._count._all;
      total += g._count._all;
    }
    return { total, ...counts };
  },

  /**
   * Which trip this vehicle was actually on for a given date, if any — lets
   * Fuel Entry / FASTag forms show the trip (and its driver) they're about
   * to auto-attach before the user submits, instead of it only resolving
   * silently server-side. Day-range match (not point-in-time) since these
   * forms only collect a date, not a time-of-day.
   */
  async activeTripForVehicle(vehicleId: string, at: Date) {
    const trip = await tripRepository.findActiveTripForVehicleOnDate(vehicleId, at);
    if (!trip) return null;
    return {
      id: trip.id,
      tripNumber: trip.tripNumber,
      driver: trip.driver ? { id: trip.driver.id, name: trip.driver.name, code: trip.driver.code } : null,
    };
  },

  /** The vehicle's current trip, else its last trip — the same resolution FASTag toll usage always attaches to, exposed so the form can preview it before submit. */
  async currentOrLastTripForVehicle(vehicleId: string) {
    const trip = await tripRepository.findCurrentOrLastTripForVehicle(vehicleId);
    if (!trip) return null;
    return {
      id: trip.id,
      tripNumber: trip.tripNumber,
      driver: trip.driver ? { id: trip.driver.id, name: trip.driver.name, code: trip.driver.code } : null,
    };
  },

  async timeline(id: string, roles: string[] = [], userId?: string) {
    const trip = await tripRepository.findById(id);
    if (!trip) {
      throw new AppError('Trip not found', 404);
    }
    assertTripVehicleAccess(trip, roles);
    if (userId) {
      await assertTripCompanyAccess(trip, roles, userId);
    }
    return tripRepository.getStatusHistory(id);
  },

  // Vehicles/drivers not currently tied up on another trip — feeds the
  // Assign Vehicle & Driver picker so a busy resource can't even be selected,
  // rather than only being rejected on submit.
  async availableResources(excludeTripId: string | undefined, roles: string[] = []) {
    const vehicleOwnership = forcedVehicleOwnership(roles);
    const [vehicles, drivers] = await Promise.all([
      tripRepository.findAvailableVehicles(excludeTripId, vehicleOwnership),
      tripRepository.findAvailableDrivers(excludeTripId),
    ]);
    return {
      vehicles: vehicles.map((v) => ({ id: v.id, registrationNumber: v.registrationNumber, ownership: v.ownership })),
      drivers: drivers.map((d) => ({ id: d.id, name: d.name, phone: d.phone })),
    };
  },

  async create(input: CreateTripInput, actorId: string) {
    const intent = await tripRepository.findIntentById(input.intentId);
    if (!intent) {
      throw new AppError('Intent not found', 404);
    }
    if (intent.status !== 'APPROVED') {
      throw new AppError('Trips can only be created from an approved intent', 400);
    }

    const openTrips = await tripRepository.findOpenTripsByIntent(input.intentId);
    if (openTrips.length > 0) {
      throw new AppError('This intent already has a trip', 409);
    }

    const tripNumber = await tripRepository.nextTripNumber();

    const trip = await tripRepository.create({
      tripNumber,
      intentId: input.intentId,
      fromLocationId: intent.fromLocationId,
      toLocationId: intent.toLocationId,
      freightAmount: input.freightAmount ?? (intent.freightAmount ? Number(intent.freightAmount) : undefined),
      loadWeight: input.loadWeight,
      loadDescription: input.loadDescription,
      scheduledStartDate: input.scheduledStartDate ? new Date(input.scheduledStartDate) : undefined,
      expectedDeliveryDate: input.expectedDeliveryDate
        ? new Date(input.expectedDeliveryDate)
        : intent.expectedDeliveryDate ?? undefined,
      // Falls back to the intent's own POD flag — this matters most for the
      // auto-create-on-approval path (intent.service.ts approve()), which
      // never passes podRequired explicitly.
      podRequired: input.podRequired ?? intent.podRequired,
      // Trips only ever come from an already-approved intent (checked above),
      // so DRAFT/PLANNED would just be two dead clicks before ops can do
      // anything real — start straight at APPROVED, one step from ASSIGNED.
      status: 'APPROVED',
      // Copied from the intent's mandatory approval-time choice — routes this
      // trip straight into the Own or Market team's queue (trip.repository.ts
      // ownershipWhere()).
      fleetType: intent.fleetType,
      createdById: actorId,
      updatedById: actorId,
    });

    await tripRepository.addStatusHistory(trip.id, 'APPROVED', 'Trip created', actorId);

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'Trip',
      entityId: trip.id,
      description: `Created trip ${trip.tripNumber} from intent ${intent.intentNumber}`,
    });

    return tripService.getById(trip.id);
  },

  async update(id: string, input: UpdateTripInput, actorId: string) {
    const existing = await tripRepository.findById(id);
    if (!existing) {
      throw new AppError('Trip not found', 404);
    }
    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      throw new AppError(`Cannot edit a trip with status ${existing.status}`, 400);
    }

    await tripRepository.update(id, {
      freightAmount: input.freightAmount,
      loadWeight: input.loadWeight,
      loadDescription: input.loadDescription,
      scheduledStartDate: input.scheduledStartDate ? new Date(input.scheduledStartDate) : undefined,
      expectedDeliveryDate: input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : undefined,
      podRequired: input.podRequired,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Trip',
      entityId: id,
      description: `Updated trip ${existing.tripNumber} planning details`,
    });

    return tripService.getById(id);
  },

  async assign(id: string, input: AssignTripInput, actorId: string, roles: string[] = []) {
    const existing = await tripRepository.findById(id);
    if (!existing) {
      throw new AppError('Trip not found', 404);
    }

    const vehicle = await tripRepository.findVehicleById(input.vehicleId);
    if (!vehicle) throw new AppError('Vehicle not found', 404);
    assertVehicleAccess(vehicle.ownership, roles);
    if (!vehicle.isActive || vehicle.status === 'UNDER_MAINTENANCE' || vehicle.status === 'INACTIVE') {
      throw new AppError(`Vehicle is not available (status: ${vehicle.status})`, 400);
    }
    const vehicleBusy = await tripRepository.findActiveTripByVehicle(input.vehicleId, id);
    if (vehicleBusy) {
      throw new AppError('Vehicle is already assigned to another active trip', 409);
    }

    const driver = await tripRepository.findDriverById(input.driverId);
    if (!driver) throw new AppError('Driver not found', 404);
    if (!driver.isActive) throw new AppError('Driver is inactive', 400);
    const driverBusy = await tripRepository.findActiveTripByDriver(input.driverId, id);
    if (driverBusy) {
      throw new AppError('Driver is already assigned to another active trip', 409);
    }

    await tripRepository.update(id, {
      vehicleId: input.vehicleId,
      driverId: input.driverId,
      status: 'ASSIGNED',
      assignedById: actorId,
      updatedById: actorId,
    });
    await tripRepository.addStatusHistory(id, 'ASSIGNED', 'Vehicle and driver assigned', actorId);

    // Assigning a vehicle/driver is what actually converts the source intent
    // into an executing trip — until now it sat APPROVED-but-unassigned.
    await intentRepository.update(existing.intentId, { status: 'CONVERTED', updatedById: actorId });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Trip',
      entityId: id,
      description: `Assigned vehicle ${vehicle.registrationNumber} and driver ${driver.name} to trip ${existing.tripNumber}`,
    });

    return tripService.getById(id);
  },

  // Unified "Allocate Asset" action — Own Fleet picks a real Vehicle/Driver
  // (same validation as assign()); Market Truck records an ad-hoc vendor
  // truck/driver that isn't in the fleet master. Either way it moves the
  // trip to ASSIGNED and converts the source intent, and optionally records
  // client/supplier advance payments against the allocation.
  async allocate(id: string, input: AllocateAssetInput, actorId: string, roles: string[] = []) {
    const existing = await tripRepository.findById(id);
    if (!existing) {
      throw new AppError('Trip not found', 404);
    }
    assertAllocationTypeAccess(input.allocationType, roles);
    assertFleetTypeMatch(existing, input.allocationType);

    if (input.allocationType === 'OWN_FLEET') {
      const vehicle = await tripRepository.findVehicleById(input.vehicleId);
      if (!vehicle) throw new AppError('Vehicle not found', 404);
      assertVehicleAccess(vehicle.ownership, roles);
      if (!vehicle.isActive || vehicle.status === 'UNDER_MAINTENANCE' || vehicle.status === 'INACTIVE') {
        throw new AppError(`Vehicle is not available (status: ${vehicle.status})`, 400);
      }
      const vehicleBusy = await tripRepository.findActiveTripByVehicle(input.vehicleId, id);
      if (vehicleBusy) {
        throw new AppError('Vehicle is already assigned to another active trip', 409);
      }

      const driver = await tripRepository.findDriverById(input.driverId);
      if (!driver) throw new AppError('Driver not found', 404);
      if (!driver.isActive) throw new AppError('Driver is inactive', 400);
      const driverBusy = await tripRepository.findActiveTripByDriver(input.driverId, id);
      if (driverBusy) {
        throw new AppError('Driver is already assigned to another active trip', 409);
      }

      await tripRepository.update(id, {
        vehicleId: input.vehicleId,
        driverId: input.driverId,
        status: 'ASSIGNED',
        assignedById: actorId,
        updatedById: actorId,
      });
      await tripRepository.addStatusHistory(id, 'ASSIGNED', 'Own fleet vehicle and driver allocated', actorId);
      await vehicleAssignmentService.syncForVehicleDriver(input.vehicleId, input.driverId, actorId);

      await auditService.record({
        userId: actorId,
        action: 'UPDATE',
        entityType: 'Trip',
        entityId: id,
        description: `Allocated own fleet vehicle ${vehicle.registrationNumber} and driver ${driver.name} to trip ${existing.tripNumber}`,
      });
    } else {
      // Own fleet is first preference — market truck is only a fallback once
      // no own vehicle of the requested type is free. This safeguard only
      // applies to legacy trips (fleetType null, predate the mandatory
      // approval-time choice): once the Operation Manager has explicitly
      // routed a trip to the Market Vehicle team (fleetType === 'MARKET'),
      // that decision is authoritative and overrides this check.
      if (!existing.fleetType) {
        const availableOwnVehicles = await tripRepository.findAvailableVehicles(
          id,
          'OWN',
          existing.intent.vehicleTypeId ?? undefined
        );
        if (availableOwnVehicles.length > 0) {
          throw new AppError(
            'Own fleet vehicles are available for this trip — assign an own vehicle before allocating a market truck',
            409
          );
        }
      }

      const supplier = await tripRepository.findSupplierById(input.supplierId);
      if (!supplier) throw new AppError('Supplier not found', 404);

      // The Operation Manager's authorized hiring cap (Intent.opsAmount, set
      // at approval — see intent.service.ts approve()). Distinct from
      // freightAmount (final client billing amount) — the market hiring
      // cost can never exceed this ceiling.
      const opsAmount = existing.intent.opsAmount ? Number(existing.intent.opsAmount) : 0;
      if (opsAmount > 0 && input.tripAmount > opsAmount) {
        throw new AppError(
          `Trip amount cannot exceed the approved operation amount of ₹${opsAmount}`,
          400
        );
      }

      await tripRepository.update(id, {
        vehicleId: null,
        driverId: null,
        supplierId: input.supplierId,
        supplierRate: input.tripAmount,
        marketVehicleNumber: input.marketVehicleNumber,
        marketDriverName: input.marketDriverName,
        marketDriverContact: input.marketDriverContact,
        status: 'ASSIGNED',
        assignedById: actorId,
        updatedById: actorId,
      });
      await tripRepository.addStatusHistory(id, 'ASSIGNED', 'Market truck allocated', actorId);

      await auditService.record({
        userId: actorId,
        action: 'UPDATE',
        entityType: 'Trip',
        entityId: id,
        description: `Allocated market truck from ${supplier.name} (${input.marketVehicleNumber || 'no reg. no.'}) to trip ${existing.tripNumber} at ₹${input.tripAmount}`,
      });

      if (input.supplierAdvance) {
        await supplierPaymentService.create(
          {
            supplierId: input.supplierId,
            amount: input.supplierAdvance,
            remarks: `Advance for trip ${existing.tripNumber}`,
          },
          actorId
        );
      }
    }

    // Allocating (either path) is what actually converts the source intent
    // into an executing trip — until now it sat APPROVED-but-unassigned.
    await intentRepository.update(existing.intentId, { status: 'CONVERTED', updatedById: actorId });

    if (input.clientAdvance) {
      await receiptService.create(
        {
          companyId: existing.intent.companyId,
          amount: input.clientAdvance,
          remarks: `Advance for trip ${existing.tripNumber}`,
        },
        actorId
      );
    }

    return tripService.getById(id);
  },

  async updateStatus(
    id: string,
    status: TripStatus,
    notes: string | undefined,
    actorId: string,
    additionalCharge?: number
  ) {
    const existing = await tripRepository.findById(id);
    if (!existing) {
      throw new AppError('Trip not found', 404);
    }

    const allowed = ALLOWED_TRANSITIONS[existing.status];
    if (!allowed.includes(status)) {
      throw new AppError(`Cannot move trip from ${existing.status} to ${status}`, 400);
    }

    // Generic status transitions (e.g. the Trip Follow-up "Mark as Assigned"
    // button) must not be a backdoor around the dedicated allocate() endpoint's
    // validation — a trip can't be ASSIGNED without an asset, own fleet
    // (vehicleId + driverId) or market truck (supplierId + driver contact).
    const hasAllocatedAsset = !!(
      (existing.vehicleId && existing.driverId) ||
      (existing.supplierId && existing.marketDriverContact)
    );

    if (status === 'ASSIGNED') {
      if (!hasAllocatedAsset) {
        throw new AppError('Trip cannot be marked as assigned without a vehicle/driver or market truck allocated', 400);
      }
    }

    if (status === 'STARTED') {
      if (!hasAllocatedAsset) {
        throw new AppError('Trip cannot start without a vehicle/driver or market truck allocated', 400);
      }
    }

    if (status === 'COMPLETED' && existing.podRequired) {
      const podCount = await tripRepository.countPodDocuments(id);
      if (podCount === 0) {
        throw new AppError('Trip cannot be completed without a POD document uploaded', 400);
      }
    }

    const updateData: Parameters<typeof tripRepository.update>[1] = { status, updatedById: actorId };
    if (status === 'STARTED') updateData.actualStartDate = new Date();
    let completedAt: Date | undefined;
    if (status === 'COMPLETED') {
      completedAt = new Date();
      updateData.actualEndDate = completedAt;
    }

    // Loading/unloading charges are billed straight to the customer — added
    // onto freightAmount (picked up by invoice.service.ts's generate()),
    // not logged as a company-side TripExpense/VehicleExpense cost.
    let historyNotes = notes;
    if ((status === 'LOADING' || status === 'UNLOADING') && additionalCharge) {
      const chargeField = status === 'LOADING' ? 'loadingCharges' : 'unloadingCharges';
      updateData[chargeField] = additionalCharge;
      updateData.freightAmount = Number(existing.freightAmount || 0) + additionalCharge;
      const chargeLabel = status === 'LOADING' ? 'Loading' : 'Unloading';
      const chargeNote = `${chargeLabel} charges: ${additionalCharge} (added to freight)`;
      historyNotes = notes ? `${notes} — ${chargeNote}` : chargeNote;
    }

    // Move the trip only if it is still in the status this call validated
    // against. The transition check above is decided before it is acted on,
    // so five simultaneous "Mark as Started" clicks all passed it and all
    // wrote — leaving five identical STARTED rows in the trip's history.
    // Matching on the expected status makes the move a single atomic step,
    // and whoever arrives second is told the trip has already moved.
    const moved = await tripRepository.updateIfStatus(id, existing.status, updateData);
    if (moved === 0) {
      const current = await tripRepository.findById(id);
      throw new AppError(
        `This trip is already ${current?.status ?? 'in another status'} — someone else updated it. Reload to see the latest.`,
        409
      );
    }
    await tripRepository.addStatusHistory(id, status, historyNotes, actorId);

    if (existing.vehicleId) {
      if (status === 'STARTED') {
        await tripRepository.setVehicleStatus(existing.vehicleId, 'RUNNING', actorId);
      } else if (status === 'COMPLETED' || status === 'CANCELLED') {
        await tripRepository.setVehicleStatus(existing.vehicleId, 'AVAILABLE', actorId);
      }
    }

    if (status === 'COMPLETED' && existing.vehicleId && existing.driverId) {
      await postDriverSalaryExpense(existing, completedAt as Date, actorId);
    }

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Trip',
      entityId: id,
      description: `Trip ${existing.tripNumber} status changed to ${status}`,
    });

    return tripService.getById(id);
  },

  async cancel(id: string, cancelReason: string, actorId: string) {
    const existing = await tripRepository.findById(id);
    if (!existing) {
      throw new AppError('Trip not found', 404);
    }
    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      throw new AppError(`Trip is already ${existing.status.toLowerCase()}`, 400);
    }

    await tripRepository.update(id, { status: 'CANCELLED', cancelReason, updatedById: actorId });
    await tripRepository.addStatusHistory(id, 'CANCELLED', cancelReason, actorId);

    if (existing.vehicleId) {
      await tripRepository.setVehicleStatus(existing.vehicleId, 'AVAILABLE', actorId);
    }

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'Trip',
      entityId: id,
      description: `Cancelled trip ${existing.tripNumber}: ${cancelReason}`,
    });

    return tripService.getById(id);
  },

  async remove(id: string, actorId: string) {
    const existing = await tripRepository.findById(id);
    if (!existing) {
      throw new AppError('Trip not found', 404);
    }
    if (!['DRAFT', 'APPROVED', 'CANCELLED'].includes(existing.status)) {
      throw new AppError('Only draft, approved (unassigned), or cancelled trips can be deleted', 400);
    }

    await tripRepository.softDelete(id, actorId);

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'Trip',
      entityId: id,
      description: `Deleted trip ${existing.tripNumber}`,
    });
  },
};
