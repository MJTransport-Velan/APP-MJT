import { VehicleStatus } from '@prisma/client';
import { prisma } from '../config/db';

type VehicleDocumentField = 'photo' | 'fitnessDocument' | 'pucDocument';

export const vehicleFleetRepository = {
  findById(id: string) {
    return prisma.vehicle.findFirst({
      where: { id, deletedAt: null },
      include: { vehicleType: true, supplier: true },
    });
  },

  setStatus(id: string, status: VehicleStatus, updatedById: string) {
    return prisma.vehicle.update({ where: { id }, data: { status, updatedById } });
  },

  updateCompliance(
    id: string,
    data: Partial<{
      fastagNumber: string;
      gpsDeviceNumber: string;
      rcExpiryDate: Date;
      insuranceExpiryDate: Date;
      permitExpiryDate: Date;
      fitnessExpiryDate: Date;
      pucExpiryDate: Date;
    }>,
    updatedById: string
  ) {
    return prisma.vehicle.update({ where: { id }, data: { ...data, updatedById } });
  },

  setDocument(id: string, field: VehicleDocumentField, value: string, updatedById: string) {
    return prisma.vehicle.update({ where: { id }, data: { [field]: value, updatedById } });
  },

  findActiveAssignment(vehicleId: string) {
    return prisma.vehicleAssignment.findFirst({ where: { vehicleId, status: 'ACTIVE' } });
  },

  findByFastag(fastagNumber: string) {
    return prisma.vehicle.findFirst({ where: { fastagNumber, deletedAt: null } });
  },

  findByGps(gpsDeviceNumber: string) {
    return prisma.vehicle.findFirst({ where: { gpsDeviceNumber, deletedAt: null } });
  },
};
