import {
  driverSalaryStructureRepository,
  DriverSalaryStructureWithRelations,
} from '../repositories/driver-salary-structure.repository';
import { AppError } from '../middlewares/error.middleware';
import { auditService } from './audit.service';
import { CreateDriverSalaryStructureInput } from '../validators/driver-salary-structure.validator';

function serialize(s: DriverSalaryStructureWithRelations) {
  return {
    id: s.id,
    driverId: s.driverId,
    salaryType: s.salaryType,
    fixedAmount: s.fixedAmount,
    percentValue: s.percentValue,
    effectiveFrom: s.effectiveFrom,
    isActive: s.isActive,
    driver: { id: s.driver.id, name: s.driver.name, code: s.driver.code },
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export const driverSalaryStructureService = {
  async listForDriver(driverId: string) {
    const rows = await driverSalaryStructureRepository.findManyForDriver(driverId);
    return rows.map(serialize);
  },

  async getActiveForDriver(driverId: string) {
    const structure = await driverSalaryStructureRepository.findActiveForDriver(driverId);
    return structure ? serialize(structure) : null;
  },

  /** Exactly one active salary structure per driver at a time — creating a new one deactivates the prior (versioned, not overwritten). */
  async create(input: CreateDriverSalaryStructureInput, actorId: string) {
    const driver = await driverSalaryStructureRepository.findDriverById(input.driverId);
    if (!driver) throw new AppError('Driver not found', 404);
    if (!driver.isActive) throw new AppError('Cannot set a salary structure for an inactive driver', 409);

    await driverSalaryStructureRepository.deactivateAllForDriver(input.driverId, actorId);

    const structure = await driverSalaryStructureRepository.create({
      driverId: input.driverId,
      salaryType: input.salaryType,
      fixedAmount: input.salaryType === 'FIXED' ? input.fixedAmount : undefined,
      percentValue: input.salaryType === 'PERCENT_OF_FREIGHT' ? input.percentValue : undefined,
      effectiveFrom: new Date(input.effectiveFrom),
      createdById: actorId,
      updatedById: actorId,
    });

    const description =
      input.salaryType === 'FIXED'
        ? `Set fixed monthly salary of ₹${input.fixedAmount} for ${driver.name}`
        : `Set salary of ${input.percentValue}% of freight for ${driver.name}`;

    await auditService.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'DriverSalaryStructure',
      entityId: structure.id,
      description,
    });

    return serialize(structure);
  },

  async remove(id: string, actorId: string) {
    const existing = await driverSalaryStructureRepository.findById(id);
    if (!existing) throw new AppError('Driver Salary Structure not found', 404);

    await driverSalaryStructureRepository.softDelete(id, actorId);
    await auditService.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'DriverSalaryStructure',
      entityId: id,
      description: `Deleted salary structure for ${existing.driver.name}`,
    });
  },

  /**
   * A driver's base pay for a settlement period, per their active salary
   * structure — FIXED is the flat monthly amount as-is (not prorated);
   * PERCENT_OF_FREIGHT is that percentage of the freightAmount total across
   * their COMPLETED trips in the period. Returns null (no SALARY line) if
   * the driver has no salary structure configured.
   */
  async computeForPeriod(driverId: string, periodStart: Date, periodEnd: Date) {
    const structure = await driverSalaryStructureRepository.findActiveForDriver(driverId);
    if (!structure) return null;

    if (structure.salaryType === 'FIXED') {
      return { amount: Number(structure.fixedAmount), description: 'Fixed monthly salary' };
    }

    const freightTotal = await driverSalaryStructureRepository.sumFreightForDriverInPeriod(driverId, periodStart, periodEnd);
    const percentValue = Number(structure.percentValue);
    const amount = Math.round(freightTotal * (percentValue / 100) * 100) / 100;
    return { amount, description: `${percentValue}% of freight (₹${freightTotal})` };
  },

  /**
   * A driver's salary cost attributable to a single completed trip, per
   * their active salary structure. PERCENT_OF_FREIGHT maps naturally onto
   * one trip (that trip's own freightAmount). FIXED has no natural
   * per-trip figure — it's a monthly amount — so it's allocated as a share
   * of the trip's calendar-day span within its completion month (days
   * capped to that month's length, in case the trip started in an earlier
   * month). Returns null if the driver has no salary structure configured.
   */
  async computeForTrip(driverId: string, trip: { freightAmount: number | null; actualStartDate: Date | null; actualEndDate: Date }) {
    const structure = await driverSalaryStructureRepository.findActiveForDriver(driverId);
    if (!structure) return null;

    if (structure.salaryType === 'PERCENT_OF_FREIGHT') {
      const freight = Number(trip.freightAmount || 0);
      const percentValue = Number(structure.percentValue);
      const amount = Math.round(freight * (percentValue / 100) * 100) / 100;
      return { amount, description: `${percentValue}% of trip freight (₹${freight})` };
    }

    const end = trip.actualEndDate;
    const start = trip.actualStartDate ?? end;
    const daysInMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
    const startDay = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
    const endDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
    const spanDays = Math.min(daysInMonth, Math.round((endDay - startDay) / 86400000) + 1);
    const fixedAmount = Number(structure.fixedAmount);
    const amount = Math.round((fixedAmount / daysInMonth) * spanDays * 100) / 100;
    return { amount, description: `Fixed salary share (${spanDays}/${daysInMonth} days of ₹${fixedAmount})` };
  },
};
