import { Request } from 'express';
import { fixedAssetRepository, FixedAssetWithRelations } from '../repositories/fixed-asset.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { organizationService } from './organization.service';
import { resolveFundAccount, adjustFundAccountBalance } from '../utils/fundAccount.util';
import { prisma } from '../config/db';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateFixedAssetInput, ApproveFixedAssetInput } from '../validators/fixed-asset.validator';

function serialize(a: FixedAssetWithRelations) {
  return {
    id: a.id,
    assetCode: a.assetCode,
    assetName: a.assetName,
    category: { id: a.category.id, name: a.category.name, assetType: a.category.assetType },
    vehicle: a.vehicle ? { id: a.vehicle.id, registrationNumber: a.vehicle.registrationNumber } : null,
    supplier: a.supplier ? { id: a.supplier.id, name: a.supplier.name } : null,
    department: a.department ? { id: a.department.id, name: a.department.name } : null,
    purchaseDate: a.purchaseDate,
    capitalizationDate: a.capitalizationDate,
    purchaseValue: a.purchaseValue,
    residualValue: a.residualValue,
    usefulLifeMonths: a.usefulLifeMonths,
    depreciationMethod: a.depreciationMethod,
    currentValue: a.currentValue,
    locationText: a.locationText,
    status: a.status,
    approvalStatus: a.approvalStatus,
    vehicleLoans: a.vehicleLoans,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

export const fixedAssetService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const { rows, total } = await fixedAssetRepository.findManyPaginated({
      skip,
      take,
      search: (query.search as string) || undefined,
      categoryId: (query.categoryId as string) || undefined,
      status: (query.status as never) || undefined,
      approvalStatus: (query.approvalStatus as string) || undefined,
    });
    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const asset = await fixedAssetRepository.findById(id);
    if (!asset) throw new AppError('Fixed Asset not found', 404);
    return serialize(asset);
  },

  /** Registers the asset — no Voucher yet, until approve() records how the purchase was funded (design doc §6.1/§6.2). */
  async register(input: CreateFixedAssetInput, actorId: string) {
    const category = await fixedAssetRepository.findCategoryById(input.categoryId);
    if (!category) throw new AppError('Asset Category not found', 404);

    if (input.vehicleId) {
      const existingForVehicle = await prisma.fixedAsset.findFirst({ where: { vehicleId: input.vehicleId, deletedAt: null } });
      if (existingForVehicle) throw new AppError('This vehicle already has a Fixed Asset record', 409);
    }

    const residualValue = input.residualValue ?? Number((input.purchaseValue * Number(category.residualValuePercent)) / 100);
    const usefulLifeMonths = input.usefulLifeMonths ?? category.usefulLifeMonths;
    const depreciationMethod = input.depreciationMethod ?? category.depreciationMethod;

    const assetCode = await fixedAssetRepository.nextAssetCode(category.code);
    const asset = await fixedAssetRepository.create({
      assetCode,
      assetName: input.assetName,
      categoryId: input.categoryId,
      vehicleId: input.vehicleId,
      supplierId: input.supplierId,
      purchaseDate: new Date(input.purchaseDate),
      capitalizationDate: new Date(input.capitalizationDate ?? input.purchaseDate),
      purchaseValue: input.purchaseValue,
      residualValue,
      usefulLifeMonths,
      depreciationMethod,
      currentValue: input.purchaseValue,
      departmentId: input.departmentId,
      locationText: input.locationText,
      responsiblePersonId: input.responsiblePersonId,
      createdById: actorId,
      updatedById: actorId,
    });

    await auditService.record({ userId: actorId, action: 'CREATE', entityType: 'FixedAsset', entityId: asset.id, description: `Registered fixed asset ${asset.assetCode} — ${asset.assetName}` });
    return fixedAssetService.getById(asset.id);
  },

  /**
   * Approving a purchase directly debits each Bank/Cash funding line's
   * currentBalance for its share of the purchase value. LOAN and SUPPLIER
   * funding lines are validated (loan must be ACTIVE / supplier must
   * exist) but don't touch any stored balance — a VehicleLoan's principal
   * is fixed at creation and supplier payables aren't tracked as a ledger
   * anymore, so there is nothing further to post for those lines.
   */
  async approve(id: string, input: ApproveFixedAssetInput, actorId: string) {
    const existing = await fixedAssetRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Fixed Asset not found', 404);
    if (existing.approvalStatus !== 'PENDING') throw new AppError(`Asset has already been ${existing.approvalStatus.toLowerCase()}`, 409);

    const totalFunding = input.fundingLines.reduce((sum, l) => sum + l.amount, 0);
    if (Math.abs(totalFunding - Number(existing.purchaseValue)) > 0.01) {
      throw new AppError(`Funding lines total (${totalFunding}) must equal the purchase value (${existing.purchaseValue})`, 422);
    }

    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const category = await fixedAssetRepository.findCategoryById(existing.categoryId);
    if (!category) throw new AppError('Asset Category not found', 404);

    const fundAccountAdjustments: { type: 'BANK' | 'CASH'; id: string; amount: number }[] = [];
    for (const line of input.fundingLines) {
      if (line.type === 'BANK' || line.type === 'CASH') {
        if (!line.fundAccountId) throw new AppError('fundAccountId is required for a Bank/Cash funding line', 422);
        const fundAccount = await resolveFundAccount(organizationId, line.type, line.fundAccountId);
        if (!fundAccount.isActive) throw new AppError('The selected Bank/Cash account is inactive', 409);
        fundAccountAdjustments.push({ type: fundAccount.type, id: fundAccount.id, amount: line.amount });
      } else if (line.type === 'LOAN') {
        if (!line.vehicleLoanId) throw new AppError('vehicleLoanId is required for a Loan funding line', 422);
        const loan = await prisma.vehicleLoan.findFirst({ where: { id: line.vehicleLoanId, deletedAt: null } });
        if (!loan) throw new AppError('Vehicle Loan not found', 404);
        if (loan.status !== 'ACTIVE') throw new AppError('Vehicle Loan must be approved (ACTIVE) before it can fund a purchase', 409);
      } else {
        if (!existing.supplierId) throw new AppError('This asset has no purchase vendor set — cannot use a Supplier funding line', 422);
        const supplier = await prisma.supplier.findFirst({ where: { id: existing.supplierId, deletedAt: null } });
        if (!supplier) throw new AppError('Supplier not found', 404);
      }
    }

    for (const adj of fundAccountAdjustments) {
      await adjustFundAccountBalance(adj.type, adj.id, -adj.amount);
    }

    await fixedAssetRepository.update(id, {
      approvalStatus: 'APPROVED',
      approvedById: actorId,
      organizationId,
      updatedById: actorId,
    });

    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'FixedAsset', entityId: id, description: `Approved fixed asset purchase ${existing.assetCode}` });
    return fixedAssetService.getById(id);
  },

  async reject(id: string, actorId: string, reason?: string) {
    const existing = await fixedAssetRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Fixed Asset not found', 404);
    if (existing.approvalStatus !== 'PENDING') throw new AppError(`Asset has already been ${existing.approvalStatus.toLowerCase()}`, 409);

    await fixedAssetRepository.update(id, { approvalStatus: 'REJECTED', approvedById: actorId, updatedById: actorId });
    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'FixedAsset', entityId: id, description: `Rejected fixed asset ${existing.assetCode}${reason ? `: ${reason}` : ''}` });
    return fixedAssetService.getById(id);
  },

  async remove(id: string, actorId: string) {
    const existing = await fixedAssetRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Fixed Asset not found', 404);
    if (existing.approvalStatus === 'APPROVED') throw new AppError('Cannot delete an approved asset that has already been funded', 409);

    await fixedAssetRepository.softDelete(id, actorId);
    await auditService.record({ userId: actorId, action: 'DELETE', entityType: 'FixedAsset', entityId: id, description: `Deleted fixed asset ${existing.assetCode}` });
  },

  /** Recomputes and caches currentValue — called after every depreciation run / disposal (design doc §7.2). */
  async recalcCurrentValue(assetId: string) {
    const asset = await fixedAssetRepository.findByIdBasic(assetId);
    if (!asset) return;
    const depreciated = await fixedAssetRepository.sumDepreciation(assetId);
    const currentValue = Math.max(Number(asset.purchaseValue) - Number(depreciated._sum.depreciationAmount || 0), Number(asset.residualValue));
    await prisma.fixedAsset.update({ where: { id: assetId }, data: { currentValue } });
  },
};
