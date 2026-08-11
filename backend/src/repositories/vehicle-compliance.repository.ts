import { Prisma, ComplianceType } from '@prisma/client';
import { prisma } from '../config/db';

const recordWithRelations = Prisma.validator<Prisma.VehicleComplianceRecordInclude>()({
  vehicle: { select: { id: true, registrationNumber: true } },
  claims: { orderBy: { claimDate: 'desc' } },
});

export type VehicleComplianceRecordWithRelations = Prisma.VehicleComplianceRecordGetPayload<{ include: typeof recordWithRelations }>;

export const vehicleComplianceRepository = {
  async findManyPaginated(params: { skip: number; take: number; vehicleId?: string; complianceType?: ComplianceType }) {
    const where: Prisma.VehicleComplianceRecordWhereInput = {
      deletedAt: null,
      AND: [params.vehicleId ? { vehicleId: params.vehicleId } : {}, params.complianceType ? { complianceType: params.complianceType } : {}],
    };
    const [rows, total] = await prisma.$transaction([
      prisma.vehicleComplianceRecord.findMany({ where, include: recordWithRelations, orderBy: { expiryDate: 'asc' }, skip: params.skip, take: params.take }),
      prisma.vehicleComplianceRecord.count({ where }),
    ]);
    return { rows, total };
  },

  findExpiringWithin(days: number) {
    const until = new Date();
    until.setDate(until.getDate() + days);
    return prisma.vehicleComplianceRecord.findMany({
      where: { status: 'ACTIVE', deletedAt: null, expiryDate: { lte: until } },
      include: recordWithRelations,
      orderBy: { expiryDate: 'asc' },
    });
  },

  findById(id: string) {
    return prisma.vehicleComplianceRecord.findFirst({ where: { id, deletedAt: null }, include: recordWithRelations });
  },

  findVehicleById(id: string) {
    return prisma.vehicle.findFirst({ where: { id, deletedAt: null } });
  },

  create(data: Prisma.VehicleComplianceRecordUncheckedCreateInput) {
    return prisma.vehicleComplianceRecord.create({ data, include: recordWithRelations });
  },

  update(id: string, data: Prisma.VehicleComplianceRecordUncheckedUpdateInput) {
    return prisma.vehicleComplianceRecord.update({ where: { id }, data, include: recordWithRelations });
  },

  updateVehicleExpiry(vehicleId: string, field: 'insuranceExpiryDate' | 'permitExpiryDate' | 'fitnessExpiryDate' | 'pucExpiryDate', expiryDate: Date) {
    return prisma.vehicle.update({ where: { id: vehicleId }, data: { [field]: expiryDate } });
  },

  createClaim(data: Prisma.VehicleInsuranceClaimUncheckedCreateInput) {
    return prisma.vehicleInsuranceClaim.create({ data });
  },

  updateClaim(id: string, data: Prisma.VehicleInsuranceClaimUncheckedUpdateInput) {
    return prisma.vehicleInsuranceClaim.update({ where: { id }, data });
  },

  findClaimById(id: string) {
    return prisma.vehicleInsuranceClaim.findFirst({ where: { id } });
  },
};
