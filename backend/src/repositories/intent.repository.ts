import { Prisma, IntentStatus, LoadMode, VehicleOwnership } from '@prisma/client';
import { prisma } from '../config/db';

const intentWithRelations = Prisma.validator<Prisma.IntentInclude>()({
  company: true,
  fromLocation: true,
  toLocation: true,
  material: true,
  vehicleType: true,
  createdBy: true,
});

export type IntentWithRelations = Prisma.IntentGetPayload<{ include: typeof intentWithRelations }>;

export const intentRepository = {
  async findManyPaginated(params: {
    skip: number;
    take: number;
    search?: string;
    companyId?: string;
    status?: IntentStatus;
    companyIds?: string[];
    createdById?: string;
  }) {
    const where: Prisma.IntentWhereInput = {
      deletedAt: null,
      AND: [
        params.search
          ? {
              OR: [
                { intentNumber: { contains: params.search, mode: 'insensitive' } },
                { remarks: { contains: params.search, mode: 'insensitive' } },
              ],
            }
          : {},
        params.companyId ? { companyId: params.companyId } : {},
        params.status ? { status: params.status } : {},
        params.companyIds ? { companyId: { in: params.companyIds } } : {},
        params.createdById ? { createdById: params.createdById } : {},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.intent.findMany({
        where,
        include: intentWithRelations,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.intent.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.intent.findFirst({ where: { id, deletedAt: null }, include: intentWithRelations });
  },

  findCompanyById(id: string) {
    return prisma.company.findFirst({ where: { id, deletedAt: null } });
  },

  findLocationById(id: string) {
    return prisma.location.findFirst({ where: { id, deletedAt: null } });
  },

  async nextIntentNumber() {
    const count = await prisma.intent.count();
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `INT-${datePart}-${String(count + 1).padStart(4, '0')}`;
  },

  create(data: {
    intentNumber: string;
    companyId: string;
    fromLocationId: string;
    toLocationId: string;
    materialId?: string;
    vehicleTypeId?: string;
    quantityTon?: number;
    expectedPickupDate?: Date;
    expectedDeliveryDate?: Date;
    freightAmount?: number;
    remarks?: string;
    poNumber?: string;
    packages?: number;
    volumeCbm?: number;
    loadMode?: LoadMode;
    podRequired?: boolean;
    insuranceRequired?: boolean;
    baseFreightAmount?: number;
    tollCharges?: number;
    loadingCharges?: number;
    otherCharges?: number;
    createdById: string;
    updatedById: string;
  }) {
    return prisma.intent.create({ data });
  },

  update(
    id: string,
    data: Partial<{
      fromLocationId: string;
      toLocationId: string;
      materialId: string;
      vehicleTypeId: string;
      quantityTon: number;
      expectedPickupDate: Date;
      expectedDeliveryDate: Date;
      freightAmount: number;
      opsAmount: number;
      fleetType: VehicleOwnership;
      remarks: string;
      poNumber: string;
      packages: number;
      volumeCbm: number;
      loadMode: LoadMode;
      podRequired: boolean;
      insuranceRequired: boolean;
      baseFreightAmount: number;
      tollCharges: number;
      loadingCharges: number;
      otherCharges: number;
      status: IntentStatus;
      rejectionReason: string;
      approvedById: string;
      approvedAt: Date;
      isActive: boolean;
      updatedById: string;
    }>
  ) {
    return prisma.intent.update({ where: { id }, data });
  },

  countsByStatus(companyIds?: string[], createdById?: string) {
    return prisma.intent.groupBy({
      by: ['status'],
      where: {
        deletedAt: null,
        ...(companyIds ? { companyId: { in: companyIds } } : {}),
        ...(createdById ? { createdById } : {}),
      },
      _count: { _all: true },
    });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.intent.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedById } });
  },

  /** Trips that have progressed past the auto-created APPROVED placeholder (unassigned) — used to block cancelling an intent whose trip is already in motion. */
  countTrips(intentId: string) {
    return prisma.trip.count({ where: { intentId, deletedAt: null, status: { notIn: ['DRAFT', 'APPROVED', 'CANCELLED'] } } });
  },
};
