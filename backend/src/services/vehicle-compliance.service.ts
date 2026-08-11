import { Request } from 'express';
import { vehicleComplianceRepository, VehicleComplianceRecordWithRelations } from '../repositories/vehicle-compliance.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { organizationService } from './organization.service';
import { resolveOrDefaultFundAccount, adjustFundAccountBalance } from '../utils/fundAccount.util';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateComplianceRecordInput, FileClaimInput, SettleClaimInput } from '../validators/vehicle-compliance.validator';

const VEHICLE_EXPIRY_FIELD: Record<string, 'insuranceExpiryDate' | 'permitExpiryDate' | 'fitnessExpiryDate' | 'pucExpiryDate' | undefined> = {
  INSURANCE: 'insuranceExpiryDate',
  PERMIT: 'permitExpiryDate',
  FITNESS: 'fitnessExpiryDate',
  POLLUTION: 'pucExpiryDate',
  ROAD_TAX: undefined,
};

function serialize(r: VehicleComplianceRecordWithRelations) {
  return {
    id: r.id,
    vehicle: { id: r.vehicle.id, registrationNumber: r.vehicle.registrationNumber },
    complianceType: r.complianceType,
    documentNumber: r.documentNumber,
    issuerName: r.issuerName,
    issueDate: r.issueDate,
    expiryDate: r.expiryDate,
    premiumOrFeeAmount: r.premiumOrFeeAmount,
    documentUrl: r.documentUrl,
    renewedFromId: r.renewedFromId,
    status: r.status,
    claims: r.claims,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

/** Directly debits the fund account for the premium/fee amount — no voucher/ledger posting anymore. Returns nothing when there's no fee to pay. */
async function payPremiumFromFundAccount(record: { id: string; vehicleId: string; complianceType: string; documentNumber: string; premiumOrFeeAmount: unknown }, fundAccountType: 'BANK' | 'CASH' | undefined, fundAccountId: string | undefined) {
  const amount = Number(record.premiumOrFeeAmount);
  if (!amount || amount <= 0) return;

  const organizationId = await organizationService.resolveOrganizationId(undefined);
  const fundAccount = await resolveOrDefaultFundAccount(organizationId, fundAccountType, fundAccountId);
  if (!fundAccount.isActive) throw new AppError('The selected Bank/Cash account is inactive', 409);

  await adjustFundAccountBalance(fundAccount.type, fundAccount.id, -amount);
}

export const vehicleComplianceService = {
  async list(query: Request['query']) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const { rows, total } = await vehicleComplianceRepository.findManyPaginated({
      skip,
      take,
      vehicleId: (query.vehicleId as string) || undefined,
      complianceType: (query.complianceType as never) || undefined,
    });
    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async expiringWithin(days: number) {
    const rows = await vehicleComplianceRepository.findExpiringWithin(days);
    return rows.map(serialize);
  },

  async getById(id: string) {
    const r = await vehicleComplianceRepository.findById(id);
    if (!r) throw new AppError('Compliance Record not found', 404);
    return serialize(r);
  },

  /** Premium/fee is paid in full immediately — a direct fund account debit, not a separate approval gate (design doc §6.8/§11). */
  async create(input: CreateComplianceRecordInput, actorId: string) {
    const vehicle = await vehicleComplianceRepository.findVehicleById(input.vehicleId);
    if (!vehicle) throw new AppError('Vehicle not found', 404);

    if (input.renewedFromId) {
      const prior = await vehicleComplianceRepository.findById(input.renewedFromId);
      if (prior) await vehicleComplianceRepository.update(prior.id, { status: 'RENEWED', updatedById: actorId });
    }

    const record = await vehicleComplianceRepository.create({
      vehicleId: input.vehicleId,
      complianceType: input.complianceType,
      documentNumber: input.documentNumber,
      issuerName: input.issuerName,
      issueDate: new Date(input.issueDate),
      expiryDate: new Date(input.expiryDate),
      premiumOrFeeAmount: input.premiumOrFeeAmount,
      documentUrl: input.documentUrl,
      renewedFromId: input.renewedFromId,
      createdById: actorId,
      updatedById: actorId,
    });

    await payPremiumFromFundAccount(record, input.fundAccountType, input.fundAccountId);

    const expiryField = VEHICLE_EXPIRY_FIELD[input.complianceType];
    if (expiryField) await vehicleComplianceRepository.updateVehicleExpiry(input.vehicleId, expiryField, new Date(input.expiryDate));

    await auditService.record({ userId: actorId, action: 'CREATE', entityType: 'VehicleComplianceRecord', entityId: record.id, description: `Recorded ${input.complianceType} ${input.documentNumber} for vehicle` });
    return vehicleComplianceService.getById(record.id);
  },

  async fileClaim(complianceRecordId: string, input: FileClaimInput, actorId: string) {
    const record = await vehicleComplianceRepository.findById(complianceRecordId);
    if (!record) throw new AppError('Compliance Record not found', 404);
    if (record.complianceType !== 'INSURANCE') throw new AppError('Claims can only be filed against an Insurance record', 422);
    if (record.status !== 'ACTIVE') throw new AppError('Claims can only be filed against an active insurance record', 409);

    const claim = await vehicleComplianceRepository.createClaim({
      complianceRecordId,
      claimNumber: input.claimNumber,
      claimDate: new Date(input.claimDate),
      claimAmount: input.claimAmount,
      createdById: actorId,
      updatedById: actorId,
    });

    await auditService.record({ userId: actorId, action: 'CREATE', entityType: 'VehicleInsuranceClaim', entityId: claim.id, description: `Filed insurance claim ${claim.claimNumber}` });
    return vehicleComplianceService.getById(complianceRecordId);
  },

  async settleClaim(claimId: string, input: SettleClaimInput, actorId: string) {
    const claim = await vehicleComplianceRepository.findClaimById(claimId);
    if (!claim) throw new AppError('Claim not found', 404);
    if (claim.status === 'SETTLED') throw new AppError('Claim has already been settled', 409);

    await vehicleComplianceRepository.updateClaim(claimId, {
      status: input.status,
      settledAmount: input.settledAmount,
      settlementDate: input.status === 'SETTLED' ? new Date() : undefined,
      updatedById: actorId,
    });

    await auditService.record({ userId: actorId, action: 'UPDATE', entityType: 'VehicleInsuranceClaim', entityId: claimId, description: `Updated insurance claim ${claim.claimNumber} to ${input.status}` });
    return vehicleComplianceService.getById(claim.complianceRecordId);
  },
};
