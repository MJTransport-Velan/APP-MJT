import { Request } from 'express';
import { AssignmentStatus } from '@prisma/client';
import {
  vehicleAssignmentRepository,
  VehicleAssignmentWithRelations,
} from '../repositories/vehicle-assignment.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateAssignmentInput, UpdateAssignmentInput } from '../validators/vehicle-assignment.validator';

function serialize(assignment: VehicleAssignmentWithRelations) {
  return {
    id: assignment.id,
    status: assignment.status,
    assignedAt: assignment.assignedAt,
    unassignedAt: assignment.unassignedAt,
    notes: assignment.notes,
    vehicle: { id: assignment.vehicle.id, registrationNumber: assignment.vehicle.registrationNumber },
    driver: { id: assignment.driver.id, name: assignment.driver.name },
    createdAt: assignment.createdAt,
    updatedAt: assignment.updatedAt,
  };
}

export const vehicleAssignmentService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const vehicleId = (query.vehicleId as string) || undefined;
    const driverId = (query.driverId as string) || undefined;
    const status = (query.status as AssignmentStatus) || undefined;

    const { rows, total } = await vehicleAssignmentRepository.findManyPaginated({
      skip,
      take,
      vehicleId,
      driverId,
      status,
    });

    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const assignment = await vehicleAssignmentRepository.findById(id);
    if (!assignment) {
      throw new AppError('Assignment not found', 404);
    }
    return serialize(assignment);
  },

  async create(input: CreateAssignmentInput, actorId: string) {
    const vehicle = await vehicleAssignmentRepository.findVehicleById(input.vehicleId);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }
    if (!vehicle.isActive) {
      throw new AppError('Cannot assign an inactive vehicle', 400);
    }
    if (vehicle.status === 'UNDER_MAINTENANCE' || vehicle.status === 'INACTIVE') {
      throw new AppError(`Cannot assign a vehicle with status ${vehicle.status}`, 400);
    }

    const existingActive = await vehicleAssignmentRepository.findActiveByVehicle(input.vehicleId);
    if (existingActive) {
      throw new AppError('Vehicle already has an active assignment', 409);
    }

    const driver = await vehicleAssignmentRepository.findDriverById(input.driverId);
    if (!driver) {
      throw new AppError('Driver not found', 404);
    }
    if (!driver.isActive) {
      throw new AppError('Cannot assign an inactive driver', 400);
    }

    const driverBusy = await vehicleAssignmentRepository.findActiveByDriver(input.driverId);
    if (driverBusy) {
      throw new AppError(`${driver.name} is already actively assigned to vehicle ${driverBusy.vehicle.registrationNumber}`, 409);
    }

    const assignment = await vehicleAssignmentRepository.create({
      ...input,
      createdById: actorId,
      updatedById: actorId,
    });
    await vehicleAssignmentRepository.setVehicleStatus(input.vehicleId, 'RUNNING', actorId);

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'VehicleAssignment',
      entityId: assignment.id,
      description: `Assigned driver to vehicle ${vehicle.registrationNumber}`,
    });

    return vehicleAssignmentService.getById(assignment.id);
  },

  async complete(id: string, notes: string | undefined, actorId: string) {
    const assignment = await vehicleAssignmentRepository.findById(id);
    if (!assignment) {
      throw new AppError('Assignment not found', 404);
    }
    if (assignment.status !== 'ACTIVE') {
      throw new AppError('Only active assignments can be completed', 400);
    }

    await vehicleAssignmentRepository.complete(id, notes, actorId);
    await vehicleAssignmentRepository.setVehicleStatus(assignment.vehicleId, 'AVAILABLE', actorId);

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'VehicleAssignment',
      entityId: id,
      description: `Completed assignment for vehicle ${assignment.vehicle.registrationNumber}`,
    });

    return vehicleAssignmentService.getById(id);
  },

  async cancel(id: string, actorId: string) {
    const assignment = await vehicleAssignmentRepository.findById(id);
    if (!assignment) {
      throw new AppError('Assignment not found', 404);
    }
    if (assignment.status !== 'ACTIVE') {
      throw new AppError('Only active assignments can be cancelled', 400);
    }

    await vehicleAssignmentRepository.cancel(id, actorId);
    await vehicleAssignmentRepository.setVehicleStatus(assignment.vehicleId, 'AVAILABLE', actorId);

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'VehicleAssignment',
      entityId: id,
      description: `Cancelled assignment for vehicle ${assignment.vehicle.registrationNumber}`,
    });

    return vehicleAssignmentService.getById(id);
  },

  async update(id: string, input: UpdateAssignmentInput, actorId: string) {
    const assignment = await vehicleAssignmentRepository.findById(id);
    if (!assignment) {
      throw new AppError('Assignment not found', 404);
    }

    await vehicleAssignmentRepository.updateNotes(id, input.notes, actorId);

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'VehicleAssignment',
      entityId: id,
      description: `Updated notes for assignment on vehicle ${assignment.vehicle.registrationNumber}`,
    });

    return vehicleAssignmentService.getById(id);
  },

  // Keeps VehicleAssignment in sync when a trip is allocated with a driver
  // other than the vehicle's currently active assignment — e.g. the regular
  // driver is unavailable and someone else drives this trip. Cancels
  // whatever active assignment(s) conflict (the vehicle's old driver, and/or
  // the new driver's old vehicle) and opens a fresh ACTIVE assignment for
  // this vehicle/driver pair. No-op if they're already assigned together.
  // Deliberately leaves Vehicle.status alone — trip.service owns that
  // transition on its own lifecycle (trip start/complete), not on allocation.
  async syncForVehicleDriver(vehicleId: string, driverId: string, actorId: string) {
    const activeForVehicle = await vehicleAssignmentRepository.findActiveByVehicle(vehicleId);
    if (activeForVehicle?.driverId === driverId) {
      return;
    }
    if (activeForVehicle) {
      await vehicleAssignmentRepository.cancel(activeForVehicle.id, actorId);
    }

    const activeForDriver = await vehicleAssignmentRepository.findActiveByDriver(driverId);
    if (activeForDriver && activeForDriver.vehicleId !== vehicleId) {
      await vehicleAssignmentRepository.cancel(activeForDriver.id, actorId);
    }

    const assignment = await vehicleAssignmentRepository.create({
      vehicleId,
      driverId,
      notes: 'Auto-created from trip allocation',
      createdById: actorId,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'VehicleAssignment',
      entityId: assignment.id,
      description: 'Auto-assigned driver to vehicle from trip allocation',
    });
  },

  async remove(id: string, actorId: string) {
    const assignment = await vehicleAssignmentRepository.findById(id);
    if (!assignment) {
      throw new AppError('Assignment not found', 404);
    }
    if (assignment.status === 'ACTIVE') {
      throw new AppError('Cancel or complete an active assignment before deleting it', 400);
    }

    await vehicleAssignmentRepository.remove(id);

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'VehicleAssignment',
      entityId: id,
      description: `Deleted assignment record for vehicle ${assignment.vehicle.registrationNumber}`,
    });
  },
};
