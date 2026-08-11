import { Request } from 'express';
import { assetTransferRepository, AssetTransferWithRelations } from '../repositories/asset-transfer.repository';
import { fixedAssetRepository } from '../repositories/fixed-asset.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { RequestAssetTransferInput } from '../validators/asset-transfer.validator';

function serialize(t: AssetTransferWithRelations) {
  return {
    id: t.id,
    asset: { id: t.asset.id, assetCode: t.asset.assetCode, assetName: t.asset.assetName, status: t.asset.status },
    transferType: t.transferType,
    fromDepartment: t.fromDepartment ? { id: t.fromDepartment.id, name: t.fromDepartment.name } : null,
    toDepartment: t.toDepartment ? { id: t.toDepartment.id, name: t.toDepartment.name } : null,
    fromResponsiblePersonId: t.fromResponsiblePersonId,
    toResponsiblePersonId: t.toResponsiblePersonId,
    transferDate: t.transferDate,
    reason: t.reason,
    approvalStatus: t.approvalStatus,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export const assetTransferService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const { rows, total } = await assetTransferRepository.findManyPaginated({
      skip,
      take,
      assetId: (query.assetId as string) || undefined,
      approvalStatus: (query.approvalStatus as string) || undefined,
    });
    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const transfer = await assetTransferRepository.findById(id);
    if (!transfer) throw new AppError('Asset Transfer not found', 404);
    return serialize(transfer);
  },

  /** No value change, no Voucher — purely a custody/department move gated by business approval (schema comment on AssetTransfer). */
  async request(input: RequestAssetTransferInput, actorId: string) {
    const asset = await fixedAssetRepository.findByIdBasic(input.assetId);
    if (!asset) throw new AppError('Fixed Asset not found', 404);
    if (asset.status !== 'ACTIVE') throw new AppError(`Cannot transfer an asset with status ${asset.status}`, 409);

    const transfer = await assetTransferRepository.create({
      assetId: input.assetId,
      transferType: input.transferType,
      fromDepartmentId: asset.departmentId,
      toDepartmentId: input.toDepartmentId,
      fromResponsiblePersonId: asset.responsiblePersonId,
      toResponsiblePersonId: input.toResponsiblePersonId,
      transferDate: new Date(input.transferDate),
      reason: input.reason,
      createdById: actorId,
      updatedById: actorId,
    });

    await fixedAssetRepository.update(input.assetId, { status: 'UNDER_TRANSFER', updatedById: actorId });
    await auditService.record({ userId: actorId, action: 'CREATE', entityType: 'AssetTransfer', entityId: transfer.id, description: `Requested transfer of asset ${asset.assetCode}` });
    return assetTransferService.getById(transfer.id);
  },

  async approve(id: string, actorId: string) {
    const transfer = await assetTransferRepository.findById(id);
    if (!transfer) throw new AppError('Asset Transfer not found', 404);
    if (transfer.approvalStatus !== 'PENDING') throw new AppError(`Transfer has already been ${transfer.approvalStatus.toLowerCase()}`, 409);

    await fixedAssetRepository.update(transfer.assetId, {
      status: 'ACTIVE',
      departmentId: transfer.toDepartmentId,
      responsiblePersonId: transfer.toResponsiblePersonId,
      updatedById: actorId,
    });
    await assetTransferRepository.update(id, { approvalStatus: 'APPROVED', approvedById: actorId, updatedById: actorId });

    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'AssetTransfer', entityId: id, description: `Approved transfer of asset ${transfer.asset.assetCode}` });
    return assetTransferService.getById(id);
  },

  async reject(id: string, actorId: string, reason?: string) {
    const transfer = await assetTransferRepository.findById(id);
    if (!transfer) throw new AppError('Asset Transfer not found', 404);
    if (transfer.approvalStatus !== 'PENDING') throw new AppError(`Transfer has already been ${transfer.approvalStatus.toLowerCase()}`, 409);

    await fixedAssetRepository.update(transfer.assetId, { status: 'ACTIVE', updatedById: actorId });
    await assetTransferRepository.update(id, { approvalStatus: 'REJECTED', approvedById: actorId, updatedById: actorId });

    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'AssetTransfer', entityId: id, description: `Rejected transfer of asset ${transfer.asset.assetCode}${reason ? `: ${reason}` : ''}` });
    return assetTransferService.getById(id);
  },
};
