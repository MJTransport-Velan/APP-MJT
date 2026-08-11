/**
 * Ledger.partyType/partyId and CostCenter.refType/refId are app-level
 * polymorphic references (a single column can't physically FK three
 * different possible target tables) — this is the one place their
 * existence is validated, against whichever table the type names.
 */
import { prisma } from '../config/db';
import { AppError } from '../middlewares/error.middleware';

interface PolymorphicTarget {
  label: string;
  findActive(id: string): Promise<{ id: string } | null>;
}

// EMPLOYEE / BANK / OTHER / NONE intentionally have no entry — no Employee
// model exists yet, BANK ledgers carry their details inline until the
// Phase 3 BankAccount entity exists, and OTHER/NONE are free-form by design.
const LEDGER_PARTY_TARGETS: Partial<Record<string, PolymorphicTarget>> = {
  CUSTOMER: { label: 'Customer', findActive: (id) => prisma.company.findFirst({ where: { id, deletedAt: null } }) },
  SUPPLIER: { label: 'Supplier', findActive: (id) => prisma.supplier.findFirst({ where: { id, deletedAt: null } }) },
  DRIVER: { label: 'Driver', findActive: (id) => prisma.driver.findFirst({ where: { id, deletedAt: null } }) },
  VEHICLE: { label: 'Vehicle', findActive: (id) => prisma.vehicle.findFirst({ where: { id, deletedAt: null } }) },
};

// BRANCH is deliberately absent — the existing Branch model belongs to a
// customer Company, not to MJ Transport itself (see schema.prisma PHASE 7
// comment) — branch-style cost centers stay unlinked (OTHER) for now.
const COST_CENTER_REF_TARGETS: Partial<Record<string, PolymorphicTarget>> = {
  VEHICLE: { label: 'Vehicle', findActive: (id) => prisma.vehicle.findFirst({ where: { id, deletedAt: null } }) },
  DRIVER: { label: 'Driver', findActive: (id) => prisma.driver.findFirst({ where: { id, deletedAt: null } }) },
  SUPPLIER: { label: 'Supplier', findActive: (id) => prisma.supplier.findFirst({ where: { id, deletedAt: null } }) },
  TRIP: { label: 'Trip', findActive: (id) => prisma.trip.findFirst({ where: { id, deletedAt: null } }) },
};

async function assertExists(target: PolymorphicTarget, id: string) {
  const record = await target.findActive(id);
  if (!record) {
    throw new AppError(`${target.label} with id "${id}" was not found or is inactive`, 422);
  }
}

export async function validateLedgerParty(partyType: string, partyId?: string | null): Promise<void> {
  if (!partyId) return;
  const target = LEDGER_PARTY_TARGETS[partyType];
  if (!target) return;
  await assertExists(target, partyId);
}

export async function validateCostCenterRef(refType: string, refId?: string | null): Promise<void> {
  if (!refId) return;
  const target = COST_CENTER_REF_TARGETS[refType];
  if (!target) return;
  await assertExists(target, refId);
}
