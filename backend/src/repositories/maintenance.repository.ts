import { Prisma, MaintenanceType, MaintenanceStatus } from '@prisma/client';
import { prisma } from '../config/db';

const maintenanceWithRelations = Prisma.validator<Prisma.MaintenanceRecordInclude>()({
  vehicle: true,
  serviceCategory: true,
});

export type MaintenanceWithRelations = Prisma.MaintenanceRecordGetPayload<{
  include: typeof maintenanceWithRelations;
}>;

export const maintenanceRepository = {
  async findManyPaginated(params: {
    skip: number;
    take: number;
    vehicleId?: string;
    type?: MaintenanceType;
    status?: MaintenanceStatus;
  }) {
    const where: Prisma.MaintenanceRecordWhereInput = {
      deletedAt: null,
      AND: [
        params.vehicleId ? { vehicleId: params.vehicleId } : {},
        params.type ? { type: params.type } : {},
        params.status ? { status: params.status } : {},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.maintenanceRecord.findMany({
        where,
        include: maintenanceWithRelations,
        orderBy: { serviceDate: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.maintenanceRecord.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.maintenanceRecord.findFirst({ where: { id, deletedAt: null }, include: maintenanceWithRelations });
  },

  findVehicleById(id: string) {
    return prisma.vehicle.findFirst({ where: { id, deletedAt: null } });
  },

  findUpcomingDue() {
    // Latest maintenance record per vehicle with a next-due date in the future,
    // used for the "Next Service Due" / Fleet Dashboard summary.
    return prisma.maintenanceRecord.findMany({
      where: { deletedAt: null, nextServiceDueDate: { not: null } },
      include: maintenanceWithRelations,
      orderBy: { nextServiceDueDate: 'asc' },
    });
  },

  create(data: {
    vehicleId: string;
    type: MaintenanceType;
    serviceCategoryId?: string;
    description: string;
    serviceDate: Date;
    cost?: number;
    odometerReading?: number;
    nextServiceDueDate?: Date;
    nextServiceDueOdometer?: number;
    createdById: string;
    updatedById: string;
  }) {
    return prisma.maintenanceRecord.create({ data });
  },

  update(
    id: string,
    data: Partial<{
      serviceCategoryId: string;
      description: string;
      serviceDate: Date;
      cost: number;
      odometerReading: number;
      nextServiceDueDate: Date;
      nextServiceDueOdometer: number;
      status: MaintenanceStatus;
      updatedById: string;
    }>
  ) {
    return prisma.maintenanceRecord.update({ where: { id }, data });
  },

  setAttachment(id: string, field: 'billDocument' | 'accidentPhoto', value: string, updatedById: string) {
    return prisma.maintenanceRecord.update({ where: { id }, data: { [field]: value, updatedById } });
  },

  setVehicleStatus(vehicleId: string, status: 'UNDER_MAINTENANCE' | 'AVAILABLE', updatedById: string) {
    return prisma.vehicle.update({ where: { id: vehicleId }, data: { status, updatedById } });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.maintenanceRecord.update({ where: { id }, data: { deletedAt: new Date(), updatedById } });
  },
};
