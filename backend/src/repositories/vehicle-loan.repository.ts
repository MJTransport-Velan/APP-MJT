import { Prisma, VehicleLoanStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { nextDocumentNumber, highestSequenceToday } from '../utils/documentNumber.util';

const loanWithRelations = Prisma.validator<Prisma.VehicleLoanInclude>()({
  vehicle: { select: { id: true, registrationNumber: true } },
  fixedAsset: { select: { id: true, assetCode: true } },
  installments: { orderBy: { installmentNo: 'asc' } },
  disbursements: { orderBy: { disbursementDate: 'asc' } },
});

export type VehicleLoanWithRelations = Prisma.VehicleLoanGetPayload<{ include: typeof loanWithRelations }>;

export const vehicleLoanRepository = {
  async findManyPaginated(params: { skip: number; take: number; search?: string; vehicleId?: string; status?: VehicleLoanStatus }) {
    const where: Prisma.VehicleLoanWhereInput = {
      deletedAt: null,
      AND: [
        params.search ? { loanNumber: { contains: params.search, mode: 'insensitive' } } : {},
        params.vehicleId ? { vehicleId: params.vehicleId } : {},
        params.status ? { status: params.status } : {},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.vehicleLoan.findMany({ where, include: loanWithRelations, orderBy: { createdAt: 'desc' }, skip: params.skip, take: params.take }),
      prisma.vehicleLoan.count({ where }),
    ]);

    return { rows, total };
  },

  findById(id: string) {
    return prisma.vehicleLoan.findFirst({ where: { id, deletedAt: null }, include: loanWithRelations });
  },

  findByIdBasic(id: string) {
    return prisma.vehicleLoan.findFirst({ where: { id, deletedAt: null } });
  },

  findVehicleById(id: string) {
    return prisma.vehicle.findFirst({ where: { id, deletedAt: null } });
  },

  async nextLoanNumber() {
    return nextDocumentNumber('VLN', 4, async (stamp) => {
      const rows = await prisma.vehicleLoan.findMany({
        where: { loanNumber: { startsWith: `VLN-${stamp}-` } },
        select: { loanNumber: true },
      });
      return highestSequenceToday(rows, 'loanNumber', 'VLN', stamp);
    });
  },

  create(data: Prisma.VehicleLoanUncheckedCreateInput) {
    return prisma.vehicleLoan.create({ data, include: loanWithRelations });
  },

  update(id: string, data: Prisma.VehicleLoanUncheckedUpdateInput) {
    return prisma.vehicleLoan.update({ where: { id }, data, include: loanWithRelations });
  },

  softDelete(id: string, updatedById: string) {
    return prisma.vehicleLoan.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, updatedById } });
  },

  createInstallments(data: Prisma.VehicleLoanInstallmentUncheckedCreateInput[]) {
    return prisma.vehicleLoanInstallment.createMany({ data });
  },

  findInstallmentById(id: string) {
    return prisma.vehicleLoanInstallment.findFirst({ where: { id } });
  },

  updateInstallment(id: string, data: Prisma.VehicleLoanInstallmentUncheckedUpdateInput) {
    return prisma.vehicleLoanInstallment.update({ where: { id }, data });
  },

  updateManyInstallments(loanId: string, where: Prisma.VehicleLoanInstallmentWhereInput, data: Prisma.VehicleLoanInstallmentUncheckedUpdateManyInput) {
    return prisma.vehicleLoanInstallment.updateMany({ where: { loanId, ...where }, data });
  },

  deletePendingInstallments(loanId: string) {
    return prisma.vehicleLoanInstallment.deleteMany({ where: { loanId, status: 'PENDING' } });
  },

  sumPrincipalPaid(loanId: string) {
    return prisma.vehicleLoanInstallment.aggregate({ where: { loanId, status: 'PAID' }, _sum: { principalComponent: true, interestComponent: true } });
  },

  createDisbursement(data: Prisma.VehicleLoanDisbursementUncheckedCreateInput) {
    return prisma.vehicleLoanDisbursement.create({ data });
  },
};
