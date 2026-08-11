import { Prisma, VehicleTyreStatus } from '@prisma/client';
import { prisma } from '../config/db';

const tyreWithRelations = Prisma.validator<Prisma.VehicleTyreInclude>()({
  tyre: true,
  vehicle: { select: { id: true, registrationNumber: true } },
  movements: { orderBy: { movementDate: 'desc' } },
});

export type VehicleTyreWithRelations = Prisma.VehicleTyreGetPayload<{ include: typeof tyreWithRelations }>;

export const vehicleTyreRepository = {
  async findManyPaginated(params: { skip: number; take: number; vehicleId?: string; status?: VehicleTyreStatus }) {
    const where: Prisma.VehicleTyreWhereInput = {
      AND: [params.vehicleId ? { vehicleId: params.vehicleId } : {}, params.status ? { status: params.status } : {}],
    };
    const [rows, total] = await prisma.$transaction([
      prisma.vehicleTyre.findMany({ where, include: tyreWithRelations, orderBy: { createdAt: 'desc' }, skip: params.skip, take: params.take }),
      prisma.vehicleTyre.count({ where }),
    ]);
    return { rows, total };
  },

  findById(id: string) {
    return prisma.vehicleTyre.findFirst({ where: { id }, include: tyreWithRelations });
  },

  create(data: Prisma.VehicleTyreUncheckedCreateInput) {
    return prisma.vehicleTyre.create({ data, include: tyreWithRelations });
  },

  update(id: string, data: Prisma.VehicleTyreUncheckedUpdateInput) {
    return prisma.vehicleTyre.update({ where: { id }, data, include: tyreWithRelations });
  },

  createMovement(data: Prisma.TyreMovementUncheckedCreateInput) {
    return prisma.tyreMovement.create({ data });
  },
};
