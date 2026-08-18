import { Prisma, AssignmentStatus, VehicleStatus } from '@prisma/client';
import { prisma } from '../config/db';

const assignmentWithRelations = Prisma.validator<Prisma.VehicleAssignmentInclude>()({
  vehicle: true,
  driver: true,
});

export type VehicleAssignmentWithRelations = Prisma.VehicleAssignmentGetPayload<{
  include: typeof assignmentWithRelations;
}>;

export const vehicleAssignmentRepository = {
  async findManyPaginated(params: {
    skip: number;
    take: number;
    vehicleId?: string;
    driverId?: string;
    status?: AssignmentStatus;
  }) {
    const where: Prisma.VehicleAssignmentWhereInput = {
      AND: [
        params.vehicleId ? { vehicleId: params.vehicleId } : {},
        params.driverId ? { driverId: params.driverId } : {},
        params.status ? { status: params.status } : {},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.vehicleAssignment.findMany({
        where,
        include: assignmentWithRelations,
        orderBy: { assignedAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.vehicleAssignment.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.vehicleAssignment.findUnique({ where: { id }, include: assignmentWithRelations });
  },

  findActiveByVehicle(vehicleId: string) {
    return prisma.vehicleAssignment.findFirst({ where: { vehicleId, status: 'ACTIVE' } });
  },

  findActiveByDriver(driverId: string) {
    return prisma.vehicleAssignment.findFirst({ where: { driverId, status: 'ACTIVE' }, include: { vehicle: true } });
  },

  findAllByDriver(driverId: string) {
    return prisma.vehicleAssignment.findMany({
      where: { driverId },
      include: { vehicle: true },
      orderBy: { assignedAt: 'desc' },
    });
  },

  findVehicleById(id: string) {
    return prisma.vehicle.findFirst({ where: { id, deletedAt: null } });
  },

  findDriverById(id: string) {
    return prisma.driver.findFirst({ where: { id, deletedAt: null } });
  },

  create(data: {
    vehicleId: string;
    driverId: string;
    notes?: string;
    createdById: string;
    updatedById: string;
  }) {
    return prisma.vehicleAssignment.create({ data });
  },

  complete(id: string, notes: string | undefined, updatedById: string) {
    return prisma.vehicleAssignment.update({
      where: { id },
      data: { status: 'COMPLETED', unassignedAt: new Date(), notes, updatedById },
    });
  },

  cancel(id: string, updatedById: string) {
    return prisma.vehicleAssignment.update({
      where: { id },
      data: { status: 'CANCELLED', unassignedAt: new Date(), updatedById },
    });
  },

  updateNotes(id: string, notes: string | undefined, updatedById: string) {
    return prisma.vehicleAssignment.update({
      where: { id },
      data: { notes, updatedById },
    });
  },

  remove(id: string) {
    return prisma.vehicleAssignment.delete({ where: { id } });
  },

  setVehicleStatus(vehicleId: string, status: VehicleStatus, updatedById: string) {
    return prisma.vehicle.update({ where: { id: vehicleId }, data: { status, updatedById } });
  },
};
