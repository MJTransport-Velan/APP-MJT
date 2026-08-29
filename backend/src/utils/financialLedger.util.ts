/**
 * Financial Entry's "source/destination type + id/label" resolver. In the
 * direct-balance model only BANK/CASH carry a stored balance (see
 * fundAccount.util.ts) — every other party type is purely descriptive on
 * the FinancialEntry row itself (label/id), so the only thing this module
 * still needs to do is resolve and validate a human-readable label for
 * whichever party was picked.
 */
import { prisma } from '../config/db';
import { AppError } from '../middlewares/error.middleware';

export type FinancialPartyType = 'CUSTOMER' | 'SUPPLIER' | 'DRIVER' | 'EMPLOYEE' | 'BANK' | 'CASH' | 'LOAN_PROVIDER' | 'VEHICLE' | 'TRIP' | 'EXPENSE' | 'OTHER';
export type FinancialEntryPurpose =
  | 'TRIP_ADVANCE'
  | 'TRIP_PAYMENT'
  | 'SUPPLIER_PAYMENT'
  | 'CLIENT_PAYMENT'
  | 'DRIVER_ADVANCE'
  | 'SALARY'
  | 'FUEL'
  | 'REPAIR'
  | 'INSURANCE'
  | 'LOAN_EMI'
  | 'CUSTOMER_REFUND'
  | 'SUPPLIER_REFUND'
  | 'OFFICE_EXPENSE'
  | 'TOLL'
  | 'OTHER';

/**
 * Looks up the display name for a party id AND asserts it actually exists
 * (and is active, where the master carries that flag) — a Financial Entry
 * must never silently fall back to a caller-supplied label once an id is
 * given, or a typo'd/deleted id would record the entry under the wrong
 * name. LOAN_PROVIDER/OTHER (and any type with no id) use the free-text
 * label as-is — that label IS the identity there.
 */
export async function resolveEntityLabel(
  partyType: FinancialPartyType,
  id: string | undefined,
  fallbackLabel: string | undefined
): Promise<string> {
  if (!id) {
    if (!fallbackLabel?.trim()) throw new AppError('A name is required', 422);
    return fallbackLabel.trim();
  }
  switch (partyType) {
    case 'CUSTOMER': {
      const row = await prisma.company.findFirst({ where: { id, deletedAt: null }, select: { name: true, isActive: true } });
      if (!row) throw new AppError('Customer not found', 404);
      if (!row.isActive) throw new AppError('This Customer is inactive', 409);
      return row.name;
    }
    case 'SUPPLIER': {
      const row = await prisma.supplier.findFirst({ where: { id, deletedAt: null }, select: { name: true, isActive: true } });
      if (!row) throw new AppError('Supplier not found', 404);
      if (!row.isActive) throw new AppError('This Supplier is inactive', 409);
      return row.name;
    }
    case 'DRIVER': {
      const row = await prisma.driver.findFirst({ where: { id, deletedAt: null }, select: { name: true, isActive: true } });
      if (!row) throw new AppError('Driver not found', 404);
      if (!row.isActive) throw new AppError('This Driver is inactive', 409);
      return row.name;
    }
    case 'EMPLOYEE': {
      const row = await prisma.employee.findFirst({ where: { id, deletedAt: null }, select: { name: true, isActive: true } });
      if (!row) throw new AppError('Employee not found', 404);
      if (!row.isActive) throw new AppError('This Employee is inactive', 409);
      return row.name;
    }
    case 'BANK': {
      const row = await prisma.bankAccount.findFirst({ where: { id, deletedAt: null }, select: { accountHolderName: true } });
      if (!row) throw new AppError('Bank account not found', 404);
      return row.accountHolderName;
    }
    case 'CASH': {
      const row = await prisma.cashAccount.findFirst({ where: { id, deletedAt: null }, select: { cashAccountType: true } });
      if (!row) throw new AppError('Cash account not found', 404);
      return row.cashAccountType;
    }
    case 'VEHICLE': {
      const row = await prisma.vehicle.findFirst({ where: { id, deletedAt: null }, select: { registrationNumber: true } });
      if (!row) throw new AppError('Vehicle not found', 404);
      return row.registrationNumber;
    }
    case 'TRIP': {
      const row = await prisma.trip.findFirst({ where: { id }, select: { tripNumber: true } });
      if (!row) throw new AppError('Trip not found', 404);
      return row.tripNumber;
    }
    // A lender used to be free text with no identity behind it. Where an id
    // IS given it now points at the Loan register, so the entry names the
    // actual loan rather than a typed-in string that matches nothing — this
    // is what lets a Loan EMI or a disbursement be traced back to its loan.
    // Entries that still carry only a label keep working via the !id branch
    // above, so nothing recorded before this is disturbed.
    case 'LOAN_PROVIDER': {
      const row = await prisma.loan.findFirst({
        where: { id, deletedAt: null },
        select: { lenderName: true, loanName: true },
      });
      if (!row) throw new AppError('Loan not found', 404);
      return `${row.lenderName} — ${row.loanName}`;
    }
    default:
      return fallbackLabel?.trim() || 'Other';
  }
}
