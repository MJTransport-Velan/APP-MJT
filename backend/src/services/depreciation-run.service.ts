import { Request } from 'express';
import { AssetCategory, FixedAsset } from '@prisma/client';
import { depreciationRunRepository, DepreciationRunWithRelations } from '../repositories/depreciation-run.repository';
import { fixedAssetService } from './fixed-asset.service';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateDepreciationRunInput } from '../validators/depreciation-run.validator';

const PERIOD_MONTHS: Record<string, number> = { MONTHLY: 1, QUARTERLY: 3, YEARLY: 12 };

function serialize(run: DepreciationRunWithRelations) {
  return {
    id: run.id,
    runNumber: run.runNumber,
    periodType: run.periodType,
    periodStart: run.periodStart,
    periodEnd: run.periodEnd,
    status: run.status,
    lines: run.lines.map((l) => ({
      id: l.id,
      asset: { id: l.asset.id, assetCode: l.asset.assetCode, assetName: l.asset.assetName, category: l.asset.category.name },
      openingValue: l.openingValue,
      depreciationAmount: l.depreciationAmount,
      closingValue: l.closingValue,
      method: l.method,
    })),
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
  };
}

/** SLM: (cost-residual)/usefulLifeMonths * monthsInPeriod, constant every period (design doc §11). */
function calculateStraightLine(asset: FixedAsset, monthsInPeriod: number) {
  return (Number(asset.purchaseValue) - Number(asset.residualValue)) / asset.usefulLifeMonths * monthsInPeriod;
}

/** WDV: currentBookValue * (annualRate/12) * monthsInPeriod, declining every period (design doc §11). */
function calculateWrittenDownValue(asset: FixedAsset, category: AssetCategory, currentBookValue: number, monthsInPeriod: number) {
  const annualRatePercent = category.depreciationRatePercent != null ? Number(category.depreciationRatePercent) : 100 / (asset.usefulLifeMonths / 12);
  return currentBookValue * (annualRatePercent / 100 / 12) * monthsInPeriod;
}

export const depreciationRunService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const { rows, total } = await depreciationRunRepository.findManyPaginated({ skip, take, status: (query.status as never) || undefined });
    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string) {
    const run = await depreciationRunRepository.findById(id);
    if (!run) throw new AppError('Depreciation Run not found', 404);
    return serialize(run);
  },

  async create(input: CreateDepreciationRunInput, actorId: string) {
    const periodStart = new Date(input.periodStart);
    const periodEnd = new Date(`${input.periodEnd}T23:59:59.999Z`);

    const overlapping = await depreciationRunRepository.findOverlapping(input.periodType, periodStart, periodEnd);
    if (overlapping) throw new AppError(`A depreciation run (${overlapping.runNumber}) already covers an overlapping period for ${input.periodType}`, 409);

    const runNumber = await depreciationRunRepository.nextRunNumber();
    const run = await depreciationRunRepository.create({
      runNumber,
      periodType: input.periodType,
      periodStart,
      periodEnd,
      createdById: actorId,
      updatedById: actorId,
    });

    await auditService.record({ userId: actorId, action: 'CREATE', entityType: 'DepreciationRun', entityId: run.id, description: `Created depreciation run ${run.runNumber} (${input.periodType}, ${input.periodStart} to ${input.periodEnd})` });
    return depreciationRunService.getById(run.id);
  },

  /**
   * Walks every ACTIVE asset capitalized on/before the period end, skips
   * CUSTOM-method assets (no formula defined for this phase) and assets
   * already at residual value, and freezes one DepreciationRunLine per
   * remaining asset. Recalculable while DRAFT/CALCULATED, mirroring
   * PayrollRun.calculate() (design doc §11, §13).
   */
  async calculate(id: string, actorId: string) {
    const existing = await depreciationRunRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Depreciation Run not found', 404);
    if (existing.status === 'APPROVED') throw new AppError('Cannot recalculate an approved depreciation run', 409);

    const monthsInPeriod = PERIOD_MONTHS[existing.periodType];
    const assets = await depreciationRunRepository.findEligibleAssets(existing.periodEnd);

    await depreciationRunRepository.deleteLines(id);

    const lines: { runId: string; assetId: string; openingValue: number; depreciationAmount: number; closingValue: number; method: 'STRAIGHT_LINE' | 'WRITTEN_DOWN_VALUE' | 'CUSTOM' }[] = [];
    for (const asset of assets) {
      if (asset.depreciationMethod === 'CUSTOM') continue;

      const openingValue = Number(asset.currentValue);
      const residualValue = Number(asset.residualValue);
      if (openingValue <= residualValue) continue;

      const rawAmount =
        asset.depreciationMethod === 'STRAIGHT_LINE'
          ? calculateStraightLine(asset, monthsInPeriod)
          : calculateWrittenDownValue(asset, asset.category, openingValue, monthsInPeriod);

      const depreciationAmount = Math.round(Math.min(Math.max(rawAmount, 0), openingValue - residualValue) * 100) / 100;
      if (depreciationAmount <= 0) continue;

      lines.push({
        runId: id,
        assetId: asset.id,
        openingValue,
        depreciationAmount,
        closingValue: Math.round((openingValue - depreciationAmount) * 100) / 100,
        method: asset.depreciationMethod,
      });
    }

    await depreciationRunRepository.createLines(lines);
    const updated = await depreciationRunRepository.update(id, { status: 'CALCULATED', updatedById: actorId });
    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'DepreciationRun', entityId: id, description: `Calculated depreciation run ${existing.runNumber} for ${lines.length} asset(s)` });
    return depreciationRunService.getById(updated.id);
  },

  /**
   * Depreciation never touched cash — it was always a non-cash Journal
   * Voucher (Dr Depreciation Expense / Cr Accumulated Depreciation per
   * category). With no ledgers left to post to, approval now just locks
   * the run and applies the already-computed per-line depreciation
   * amounts to each asset's currentValue — the numbers themselves stay
   * fully intact for reporting (design doc §11).
   */
  async approve(id: string, actorId: string) {
    const existing = await depreciationRunRepository.findByIdBasic(id);
    if (!existing) throw new AppError('Depreciation Run not found', 404);
    if (existing.status !== 'CALCULATED') throw new AppError('Only a calculated depreciation run can be approved', 409);

    const run = await depreciationRunRepository.findById(id);
    if (!run || run.lines.length === 0) throw new AppError('This depreciation run has no calculated lines to approve', 409);

    await depreciationRunRepository.update(id, {
      status: 'APPROVED',
      approvedById: actorId,
      updatedById: actorId,
    });

    for (const line of run.lines) {
      await fixedAssetService.recalcCurrentValue(line.assetId);
    }

    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'DepreciationRun', entityId: id, description: `Approved depreciation run ${existing.runNumber} (${run.lines.length} assets)` });
    return depreciationRunService.getById(id);
  },
};
