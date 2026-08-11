import { Prisma, VehicleBatteryStatus } from '@prisma/client';
import { prisma } from '../config/db';

const batteryWithRelations = Prisma.validator<Prisma.VehicleBatteryInclude>()({
  vehicle: { select: { id: true, registrationNumber: true } },
});

export type VehicleBatteryWithRelations = Prisma.VehicleBatteryGetPayload<{ include: typeof batteryWithRelations }>;

export const vehicleBatteryRepository = {
  async findManyPaginated(params: { skip: number; take: number; vehicleId?: string; status?: VehicleBatteryStatus }) {
    const where: Prisma.VehicleBatteryWhereInput = {
      AND: [params.vehicleId ? { vehicleId: params.vehicleId } : {}, params.status ? { status: params.status } : {}],
    };
    const [rows, total] = await prisma.$transaction([
      prisma.vehicleBattery.findMany({ where, include: batteryWithRelations, orderBy: { createdAt: 'desc' }, skip: params.skip, take: params.take }),
      prisma.vehicleBattery.count({ where }),
    ]);
    return { rows, total };
  },

  findById(id: string) {
    return prisma.vehicleBattery.findFirst({ where: { id }, include: batteryWithRelations });
  },

  create(data: Prisma.VehicleBatteryUncheckedCreateInput) {
    return prisma.vehicleBattery.create({ data, include: batteryWithRelations });
  },

  update(id: string, data: Prisma.VehicleBatteryUncheckedUpdateInput) {
    return prisma.vehicleBattery.update({ where: { id }, data, include: batteryWithRelations });
  },
};
