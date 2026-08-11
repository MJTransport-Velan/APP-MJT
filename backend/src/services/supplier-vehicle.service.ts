import { Request } from 'express';
import { prisma } from '../config/db';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';

export const supplierVehicleService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const supplierId = (query.supplierId as string) || undefined;
    const search = (query.search as string) || undefined;

    const where = {
      deletedAt: null,
      ownership: 'MARKET' as const,
      ...(supplierId ? { supplierId } : {}),
      ...(search
        ? {
            OR: [
              { registrationNumber: { contains: search, mode: 'insensitive' as const } },
              { manufacturer: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [rows, total] = await prisma.$transaction([
      prisma.vehicle.findMany({
        where,
        include: {
          vehicleType: true,
          supplier: true,
          assignments: { where: { status: 'ACTIVE' }, include: { driver: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.vehicle.count({ where }),
    ]);

    const data = rows.map((vehicle) => ({
      id: vehicle.id,
      registrationNumber: vehicle.registrationNumber,
      status: vehicle.status,
      isActive: vehicle.isActive,
      manufacturer: vehicle.manufacturer,
      model: vehicle.model,
      vehicleType: vehicle.vehicleType ? { id: vehicle.vehicleType.id, name: vehicle.vehicleType.name } : null,
      supplier: vehicle.supplier ? { id: vehicle.supplier.id, name: vehicle.supplier.name } : null,
      activeAssignment: vehicle.assignments[0]
        ? {
            driver: vehicle.assignments[0].driver.name,
            assignedAt: vehicle.assignments[0].assignedAt,
          }
        : null,
    }));

    return { data, meta: buildPaginationMeta(page, pageSize, total) };
  },

  async assignmentHistory(supplierId: string) {
    const vehicles = await prisma.vehicle.findMany({
      where: { supplierId, deletedAt: null, ownership: 'MARKET' },
      select: { id: true },
    });
    const vehicleIds = vehicles.map((v) => v.id);

    return prisma.vehicleAssignment.findMany({
      where: { vehicleId: { in: vehicleIds } },
      include: { vehicle: true, driver: true },
      orderBy: { assignedAt: 'desc' },
    });
  },
};
