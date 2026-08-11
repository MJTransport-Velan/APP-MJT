import { Request } from 'express';
import { assetDisposalRepository, AssetDisposalWithRelations } from '../repositories/asset-disposal.repository';
import { fixedAssetRepository } from '../repositories/fixed-asset.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { organizationService } from './organization.service';
import { resolveOrDefaultFundAccount, adjustFundAccountBalance } from '../utils/fundAccount.util';
import { prisma } from '../config/db';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { RaiseAssetDisposalInput, ApproveAssetDisposalInput } from '../validators/asset-disposal.validator';

function serialize(d: AssetDisposalWithRelations) {
  return {
    id: d.id,
    asset: { id: d.asset.id, assetCode: d.asset.assetCode, assetName: d.asset.assetName, category: d.asset.category.name },
    disposalType: d.disposalType,
    disposalDate: d.disposalDate,
    saleValue: d.saleValue,
    netBookValueAtDisposal: d.netBookValueAtDisposal,
    gainLossAmount: d.gainLossAmount,
    buyerDetails: d.buyerDetails,
    insuranceClaim: d.insuranceClaim ? { id: d.insuranceClaim.id, claimNumber: d.insuranceClaim.claimNumber } : null,
    exchangeGroupId: d.exchangeGroupId,
    approvalStatus: d.approvalStatus,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export const assetDisposalService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const { rows, total } = await assetDisposalRepository.findManyPaginated({
      skip,
      take,
      approvalStatus: (query.approvalStatus as string) || undefined,
      disposalType: (query.disposalType as string) || undefined,
    });
    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const disposal = await assetDisposalRepository.findById(id);
    if (!disposal) throw new AppError('Asset Disposal not found', 404);
    return serialize(disposal);
  },

  /** netBookValueAtDisposal/gainLossAmount are snapshotted here — immune to later depreciation-run changes (design doc §7.11, §19). */
  async raise(input: RaiseAssetDisposalInput, actorId: string) {
    const asset = await fixedAssetRepository.findByIdBasic(input.assetId);
    if (!asset) throw new AppError('Fixed Asset not found', 404);
    if (asset.status !== 'ACTIVE') throw new AppError(`Cannot dispose an asset with status ${asset.status}`, 409);

    const existing = await prisma.assetDisposal.findFirst({ where: { assetId: input.assetId } });
    if (existing) throw new AppError('This asset already has a disposal record', 409);

    if (input.insuranceClaimId) {
      const claim = await prisma.vehicleInsuranceClaim.findFirst({ where: { id: input.insuranceClaimId } });
      if (!claim) throw new AppError('Insurance claim not found', 404);
    }

    const netBookValueAtDisposal = Number(asset.currentValue);
    const saleValue = input.saleValue ?? 0;
    const gainLossAmount = saleValue - netBookValueAtDisposal;

    const disposal = await assetDisposalRepository.create({
      assetId: input.assetId,
      disposalType: input.disposalType,
      disposalDate: new Date(input.disposalDate),
      saleValue: input.saleValue,
      netBookValueAtDisposal,
      gainLossAmount,
      buyerDetails: input.buyerDetails,
      insuranceClaimId: input.insuranceClaimId,
      exchangeGroupId: input.exchangeGroupId,
      createdById: actorId,
      updatedById: actorId,
    });

    await fixedAssetRepository.update(input.assetId, { status: 'UNDER_TRANSFER', updatedById: actorId });
    await auditService.record({ userId: actorId, action: 'CREATE', entityType: 'AssetDisposal', entityId: disposal.id, description: `Raised ${input.disposalType} disposal for asset ${asset.assetCode}` });
    return assetDisposalService.getById(disposal.id);
  },

  /**
   * netBookValueAtDisposal/gainLossAmount stay on the AssetDisposal row
   * (snapshotted by raise()) purely for reporting — there is no ledger to
   * post the accumulated-depreciation write-back or the gain/loss to
   * anymore. The only real money movement left is sale proceeds landing
   * in a Bank/Cash fund account, which is credited directly.
   */
  async approve(id: string, input: ApproveAssetDisposalInput, actorId: string) {
    const disposal = await assetDisposalRepository.findByIdBasic(id);
    if (!disposal) throw new AppError('Asset Disposal not found', 404);
    if (disposal.approvalStatus !== 'PENDING') throw new AppError(`Disposal has already been ${disposal.approvalStatus.toLowerCase()}`, 409);

    const asset = await fixedAssetRepository.findByIdBasic(disposal.assetId);
    if (!asset) throw new AppError('Fixed Asset not found', 404);

    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const saleValue = Number(disposal.saleValue || 0);

    if (saleValue > 0) {
      const fundAccount = await resolveOrDefaultFundAccount(organizationId, input.fundAccountType, input.fundAccountId);
      if (!fundAccount.isActive) throw new AppError('The selected Bank/Cash account is inactive', 409);
      await adjustFundAccountBalance(fundAccount.type, fundAccount.id, saleValue);
    }

    await assetDisposalRepository.update(id, { approvalStatus: 'APPROVED', approvedById: actorId, organizationId, updatedById: actorId });

    await fixedAssetRepository.update(disposal.assetId, {
      status: disposal.disposalType === 'WRITE_OFF' ? 'WRITTEN_OFF' : 'DISPOSED',
      currentValue: 0,
      updatedById: actorId,
    });

    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'AssetDisposal', entityId: id, description: `Approved disposal of asset ${asset.assetCode}` });
    return assetDisposalService.getById(id);
  },

  async reject(id: string, actorId: string, reason?: string) {
    const disposal = await assetDisposalRepository.findByIdBasic(id);
    if (!disposal) throw new AppError('Asset Disposal not found', 404);
    if (disposal.approvalStatus !== 'PENDING') throw new AppError(`Disposal has already been ${disposal.approvalStatus.toLowerCase()}`, 409);

    await fixedAssetRepository.update(disposal.assetId, { status: 'ACTIVE', updatedById: actorId });
    await assetDisposalRepository.update(id, { approvalStatus: 'REJECTED', approvedById: actorId, updatedById: actorId });

    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'AssetDisposal', entityId: id, description: `Rejected asset disposal${reason ? `: ${reason}` : ''}` });
    return assetDisposalService.getById(id);
  },
};
