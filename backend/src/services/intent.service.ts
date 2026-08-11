import { Request } from 'express';
import { IntentStatus, VehicleOwnership } from '@prisma/client';
import { intentRepository, IntentWithRelations } from '../repositories/intent.repository';
import { tripRepository } from '../repositories/trip.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { tripService } from './trip.service';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { CreateIntentInput, UpdateIntentInput } from '../validators/intent.validator';
import { AuthRequest } from '../middlewares/auth.middleware';
import { forcedCompanyScope, forcedCreatedByScope } from '../utils/groupAccess';

function serialize(intent: IntentWithRelations) {
  return {
    id: intent.id,
    intentNumber: intent.intentNumber,
    status: intent.status,
    quantityTon: intent.quantityTon,
    expectedPickupDate: intent.expectedPickupDate,
    expectedDeliveryDate: intent.expectedDeliveryDate,
    freightAmount: intent.freightAmount,
    opsAmount: intent.opsAmount,
    fleetType: intent.fleetType,
    remarks: intent.remarks,
    rejectionReason: intent.rejectionReason,
    approvedAt: intent.approvedAt,
    isActive: intent.isActive,
    poNumber: intent.poNumber,
    packages: intent.packages,
    volumeCbm: intent.volumeCbm,
    loadMode: intent.loadMode,
    podRequired: intent.podRequired,
    insuranceRequired: intent.insuranceRequired,
    baseFreightAmount: intent.baseFreightAmount,
    tollCharges: intent.tollCharges,
    loadingCharges: intent.loadingCharges,
    otherCharges: intent.otherCharges,
    company: { id: intent.company.id, name: intent.company.name },
    fromLocation: { id: intent.fromLocation.id, name: intent.fromLocation.name },
    toLocation: { id: intent.toLocation.id, name: intent.toLocation.name },
    material: intent.material ? { id: intent.material.id, name: intent.material.name } : null,
    vehicleType: intent.vehicleType ? { id: intent.vehicleType.id, name: intent.vehicleType.name } : null,
    createdBy: intent.createdBy ? { id: intent.createdBy.id, fullName: intent.createdBy.fullName } : null,
    createdAt: intent.createdAt,
    updatedAt: intent.updatedAt,
  };
}

/** Sums the itemized charge fields into a single freightAmount when any are provided. */
function computeFreightAmount(input: {
  freightAmount?: number;
  baseFreightAmount?: number;
  tollCharges?: number;
  loadingCharges?: number;
  otherCharges?: number;
}) {
  const hasCharges =
    input.baseFreightAmount !== undefined ||
    input.tollCharges !== undefined ||
    input.loadingCharges !== undefined ||
    input.otherCharges !== undefined;
  if (!hasCharges) return input.freightAmount;
  return (
    (input.baseFreightAmount || 0) +
    (input.tollCharges || 0) +
    (input.loadingCharges || 0) +
    (input.otherCharges || 0)
  );
}

/**
 * An INTENT_CREATOR (or other group-scoped role) may only act on companies
 * in their own Group (GroupMembership). Unrestricted roles (managers/admins)
 * are not narrowed here.
 */
async function assertCompanyAccess(companyId: string, req: AuthRequest) {
  const scope = await forcedCompanyScope(req.user?.roles || [], req.user!.userId);
  if (scope === undefined) return;
  if (!scope.includes(companyId)) {
    throw new AppError('You do not have access to this company', 403);
  }
}

export const intentService = {
  async list(query: Request['query'], req: AuthRequest) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const search = (query.search as string) || undefined;
    const companyId = (query.companyId as string) || undefined;
    const status = (query.status as IntentStatus) || undefined;
    // Group-scoped roles (Intent Creator, etc.) only ever see intents for
    // companies in their own group, regardless of what the client passes.
    const companyIds = await forcedCompanyScope(req.user?.roles || [], req.user!.userId);
    // INTENT_CREATOR is further narrowed to only intents they personally
    // created — managers/approvers/accounts still see everyone's.
    const createdById = forcedCreatedByScope(req.user?.roles || [], req.user!.userId);

    const { rows, total } = await intentRepository.findManyPaginated({
      skip,
      take,
      search,
      companyId,
      status,
      companyIds,
      createdById,
    });
    return { data: rows.map(serialize), meta: buildPaginationMeta(page, pageSize, total) };
  },

  async getById(id: string, req?: AuthRequest) {
    const intent = await intentRepository.findById(id);
    if (!intent) {
      throw new AppError('Intent not found', 404);
    }
    if (req) {
      await assertCompanyAccess(intent.companyId, req);
    }
    return serialize(intent);
  },

  async stats(req: AuthRequest) {
    const companyIds = await forcedCompanyScope(req.user?.roles || [], req.user!.userId);
    const createdById = forcedCreatedByScope(req.user?.roles || [], req.user!.userId);
    const groups = await intentRepository.countsByStatus(companyIds, createdById);
    const counts: Record<string, number> = {
      DRAFT: 0,
      SUBMITTED: 0,
      APPROVED: 0,
      CONVERTED: 0,
      REJECTED: 0,
      CANCELLED: 0,
    };
    let total = 0;
    for (const g of groups) {
      counts[g.status] = g._count._all;
      total += g._count._all;
    }
    return { total, ...counts };
  },

  async create(input: CreateIntentInput, req: AuthRequest) {
    const actorId = req.user!.userId;

    const company = await intentRepository.findCompanyById(input.companyId);
    if (!company) {
      throw new AppError('Company not found', 404);
    }
    await assertCompanyAccess(input.companyId, req);

    const [fromLocation, toLocation] = await Promise.all([
      intentRepository.findLocationById(input.fromLocationId),
      intentRepository.findLocationById(input.toLocationId),
    ]);
    if (!fromLocation) throw new AppError('Origin location not found', 404);
    if (!toLocation) throw new AppError('Destination location not found', 404);

    const intentNumber = await intentRepository.nextIntentNumber();

    const intent = await intentRepository.create({
      intentNumber,
      companyId: input.companyId,
      fromLocationId: input.fromLocationId,
      toLocationId: input.toLocationId,
      materialId: input.materialId,
      vehicleTypeId: input.vehicleTypeId,
      quantityTon: input.quantityTon,
      expectedPickupDate: input.expectedPickupDate ? new Date(input.expectedPickupDate) : undefined,
      expectedDeliveryDate: input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : undefined,
      freightAmount: computeFreightAmount(input),
      remarks: input.remarks,
      poNumber: input.poNumber,
      packages: input.packages,
      volumeCbm: input.volumeCbm,
      loadMode: input.loadMode,
      podRequired: input.podRequired,
      insuranceRequired: input.insuranceRequired,
      baseFreightAmount: input.baseFreightAmount,
      tollCharges: input.tollCharges,
      loadingCharges: input.loadingCharges,
      otherCharges: input.otherCharges,
      createdById: actorId,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'Intent',
      entityId: intent.id,
      description: `Created intent ${intent.intentNumber} for ${company.name}`,
    });

    return intentService.getById(intent.id);
  },

  async update(id: string, input: UpdateIntentInput, req: AuthRequest) {
    const actorId = req.user!.userId;
    const existing = await intentRepository.findById(id);
    if (!existing) {
      throw new AppError('Intent not found', 404);
    }
    if (existing.status !== 'DRAFT' && existing.status !== 'SUBMITTED') {
      throw new AppError(`Cannot edit an intent with status ${existing.status}`, 400);
    }
    await assertCompanyAccess(existing.companyId, req);

    await intentRepository.update(id, {
      fromLocationId: input.fromLocationId,
      toLocationId: input.toLocationId,
      materialId: input.materialId,
      vehicleTypeId: input.vehicleTypeId,
      quantityTon: input.quantityTon,
      expectedPickupDate: input.expectedPickupDate ? new Date(input.expectedPickupDate) : undefined,
      expectedDeliveryDate: input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : undefined,
      freightAmount: computeFreightAmount(input),
      remarks: input.remarks,
      poNumber: input.poNumber,
      packages: input.packages,
      volumeCbm: input.volumeCbm,
      loadMode: input.loadMode,
      podRequired: input.podRequired,
      insuranceRequired: input.insuranceRequired,
      baseFreightAmount: input.baseFreightAmount,
      tollCharges: input.tollCharges,
      loadingCharges: input.loadingCharges,
      otherCharges: input.otherCharges,
      updatedById: actorId,
    });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Intent',
      entityId: id,
      description: `Updated intent ${existing.intentNumber}`,
    });

    return intentService.getById(id);
  },

  async submit(id: string, actorId: string) {
    const existing = await intentRepository.findById(id);
    if (!existing) {
      throw new AppError('Intent not found', 404);
    }
    if (existing.status !== 'DRAFT') {
      throw new AppError('Only draft intents can be submitted', 400);
    }

    await intentRepository.update(id, { status: 'SUBMITTED', updatedById: actorId });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Intent',
      entityId: id,
      description: `Submitted intent ${existing.intentNumber} for approval`,
    });

    return intentService.getById(id);
  },

  async approve(id: string, opsAmount: number, fleetType: VehicleOwnership, actorId: string) {
    const existing = await intentRepository.findById(id);
    if (!existing) {
      throw new AppError('Intent not found', 404);
    }
    if (existing.status !== 'SUBMITTED') {
      throw new AppError('Only submitted intents can be approved', 400);
    }

    // opsAmount ("Operation Amount (Hiring)") is set by the Operation Manager
    // at authorization time — it's the ceiling a Market Truck allocation's
    // trip amount may not exceed (see trip.service.ts allocate()). It is
    // separate from freightAmount, the final amount billed to the client,
    // which is fixed at intent creation and never changed here.
    // fleetType is the mandatory Own/Market team routing decision — copied
    // onto the auto-created Trip below so it lands in the right team's queue
    // from the start (see trip.repository.ts findManyPaginated()).
    await intentRepository.update(id, {
      status: 'APPROVED',
      opsAmount,
      fleetType,
      approvedById: actorId,
      approvedAt: new Date(),
      updatedById: actorId,
    });

    // Approval immediately stages the intent for execution: create its Trip
    // right away (unassigned, starts at APPROVED — see trip.service.ts create())
    // so ops can see and assign it without a separate manual "create trip" step.
    // The intent itself stays APPROVED until a vehicle/driver is actually
    // assigned (see trip.service assign()).
    await tripService.create({ intentId: id }, actorId);

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Intent',
      entityId: id,
      description: `Approved intent ${existing.intentNumber}`,
    });

    return intentService.getById(id);
  },

  async reject(id: string, rejectionReason: string, actorId: string) {
    const existing = await intentRepository.findById(id);
    if (!existing) {
      throw new AppError('Intent not found', 404);
    }
    if (existing.status !== 'SUBMITTED') {
      throw new AppError('Only submitted intents can be rejected', 400);
    }

    await intentRepository.update(id, { status: 'REJECTED', rejectionReason, updatedById: actorId });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Intent',
      entityId: id,
      description: `Rejected intent ${existing.intentNumber}: ${rejectionReason}`,
    });

    return intentService.getById(id);
  },

  async cancel(id: string, remarks: string | undefined, actorId: string) {
    const existing = await intentRepository.findById(id);
    if (!existing) {
      throw new AppError('Intent not found', 404);
    }
    if (existing.status === 'CANCELLED' || existing.status === 'REJECTED') {
      throw new AppError(`Intent is already ${existing.status.toLowerCase()}`, 400);
    }

    const activeTripCount = await intentRepository.countTrips(id);
    if (activeTripCount > 0) {
      throw new AppError('Cannot cancel an intent that already has a trip in progress', 409);
    }

    // Approval auto-creates an APPROVED (unassigned) trip placeholder — cancelling
    // the intent at this stage should clean that up rather than leaving an
    // orphaned trip behind. countTrips above guarantees nothing beyond that placeholder exists.
    const openTrips = await tripRepository.findOpenTripsByIntent(id);
    for (const trip of openTrips) {
      await tripRepository.softDelete(trip.id, actorId);
    }

    await intentRepository.update(id, { status: 'CANCELLED', remarks, updatedById: actorId });

    await auditService.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Intent',
      entityId: id,
      description: `Cancelled intent ${existing.intentNumber}`,
    });

    return intentService.getById(id);
  },

  async remove(id: string, actorId: string) {
    const existing = await intentRepository.findById(id);
    if (!existing) {
      throw new AppError('Intent not found', 404);
    }

    await intentRepository.softDelete(id, actorId);

    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'Intent',
      entityId: id,
      description: `Deleted intent ${existing.intentNumber}`,
    });
  },
};
