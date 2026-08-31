/**
 * Due-date reminders — the scan that turns "something is due soon" into a
 * Notification, five days ahead by default.
 *
 * Nothing here stores a due date of its own: every item is read live from
 * the record that owns it (LoanInstallment, Vehicle, Driver, Cheque,
 * Invoice, ...), exactly like the dashboards. The scan is idempotent, so
 * running it twice on the same day — or restarting the server — never
 * duplicates a reminder. See `cycleStart` below for how that works.
 */
import { NotificationPriority } from '@prisma/client';
import { dueReminderRepository } from '../repositories/due-reminder.repository';
import { notificationService } from './notification.service';
import { organizationService } from './organization.service';
import { systemSettingService } from './system-setting.service';
import { logger } from '../config/logger';

export const DEFAULT_LEAD_DAYS = 5;
export const DEFAULT_SCAN_CRON = '0 8 * * *';

/** SystemSetting keys (category NOTIFICATION) that tune the scan. */
export const LEAD_DAYS_SETTING_KEY = 'dueReminderLeadDays';
export const SCAN_CRON_SETTING_KEY = 'dueReminderCron';

export type DueReminderKind =
  | 'LOAN_EMI'
  | 'LOAN_EMI_OVERDUE'
  | 'LOAN_GIVEN_RETURN'
  | 'VEHICLE_INSURANCE'
  | 'VEHICLE_PERMIT'
  | 'VEHICLE_FITNESS'
  | 'VEHICLE_PUC'
  | 'VEHICLE_RC'
  | 'VEHICLE_SERVICE'
  | 'DRIVER_LICENCE'
  | 'CHEQUE'
  | 'INVOICE';

export interface DueItem {
  kind: DueReminderKind;
  /** Permission that decides which roles are told about this item. */
  permission: string;
  entityId: string;
  title: string;
  message: string;
  dueDate: Date;
  /** Negative once the date has passed. */
  daysLeft: number;
  amount: number | null;
  priority: NotificationPriority;
  /**
   * Start of this item's reminder cycle. A reminder already raised on or
   * after this instant belongs to the SAME cycle, so the scan skips it;
   * anything older belongs to a previous cycle (last year's insurance on the
   * same vehicle) and must not suppress today's reminder.
   */
  cycleStart: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const addDays = (d: Date, days: number) => new Date(d.getTime() + days * DAY_MS);

const daysBetween = (from: Date, to: Date) =>
  Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);

const inr = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const onDate = (d: Date) =>
  d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

/** "due in 5 days" / "due today" / "3 days overdue" — how every message ends. */
function whenPhrase(daysLeft: number) {
  if (daysLeft < 0) return `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} overdue`;
  if (daysLeft === 0) return 'due today';
  if (daysLeft === 1) return 'due tomorrow';
  return `due in ${daysLeft} days`;
}

function priorityFor(daysLeft: number): NotificationPriority {
  if (daysLeft < 0) return 'URGENT';
  if (daysLeft <= 2) return 'HIGH';
  return 'NORMAL';
}

/**
 * Every reminder kind, with the permission that governs who hears about it
 * and the label the UI groups by. Adding a kind means adding a row here and
 * a collector in collect() — nothing else in the pipeline changes.
 */
export const DUE_REMINDER_KINDS: Record<DueReminderKind, { label: string; permission: string }> = {
  LOAN_EMI: { label: 'Loan EMI', permission: 'loan.view' },
  LOAN_EMI_OVERDUE: { label: 'Overdue Loan EMI', permission: 'loan.view' },
  LOAN_GIVEN_RETURN: { label: 'Loan Given — Return Due', permission: 'loan_given.view' },
  VEHICLE_INSURANCE: { label: 'Vehicle Insurance', permission: 'vehicle.view' },
  VEHICLE_PERMIT: { label: 'Vehicle Permit', permission: 'vehicle.view' },
  VEHICLE_FITNESS: { label: 'Vehicle Fitness', permission: 'vehicle.view' },
  VEHICLE_PUC: { label: 'Vehicle PUC', permission: 'vehicle.view' },
  VEHICLE_RC: { label: 'Vehicle RC', permission: 'vehicle.view' },
  VEHICLE_SERVICE: { label: 'Vehicle Service', permission: 'maintenance.view' },
  DRIVER_LICENCE: { label: 'Driver Licence', permission: 'driver.view' },
  CHEQUE: { label: 'Cheque', permission: 'cheque.view' },
  INVOICE: { label: 'Customer Invoice', permission: 'invoice.view' },
};

const ALL_KINDS = Object.keys(DUE_REMINDER_KINDS) as DueReminderKind[];

function makeItem(params: {
  kind: DueReminderKind;
  entityId: string;
  title: string;
  detail: string;
  dueDate: Date;
  amount?: number | null;
  today: Date;
  leadDays: number;
  /** Overdue items open their cycle on the due date, not lead days before it. */
  overdue?: boolean;
}): DueItem {
  const daysLeft = daysBetween(params.today, params.dueDate);
  return {
    kind: params.kind,
    permission: DUE_REMINDER_KINDS[params.kind].permission,
    entityId: params.entityId,
    title: params.title,
    message: `${params.detail} — ${whenPhrase(daysLeft)} (${onDate(params.dueDate)}).`,
    dueDate: params.dueDate,
    daysLeft,
    amount: params.amount ?? null,
    priority: priorityFor(daysLeft),
    cycleStart: params.overdue
      ? startOfDay(params.dueDate)
      : startOfDay(addDays(params.dueDate, -params.leadDays)),
  };
}

async function collect(leadDays: number, today = new Date()): Promise<DueItem[]> {
  const from = startOfDay(today);
  const to = endOfDay(addDays(today, leadDays));
  // How far back an unpaid EMI is still worth nagging about. Anything older
  // is being chased by other means; the reminder list has to stay readable.
  const overdueFrom = startOfDay(addDays(today, -90));

  const [emis, overdueEmis, given, vehicles, drivers, services, cheques, invoices] = await Promise.all([
    dueReminderRepository.loanInstallments(from, to),
    dueReminderRepository.loanInstallments(overdueFrom, new Date(from.getTime() - 1)),
    dueReminderRepository.loansGiven(from, to),
    dueReminderRepository.vehicleDocuments(from, to),
    dueReminderRepository.driverLicences(from, to),
    dueReminderRepository.vehicleServices(from, to),
    dueReminderRepository.cheques(from, to),
    dueReminderRepository.invoices(from, to),
  ]);

  const items: DueItem[] = [];

  const emiDetail = (emi: (typeof emis)[number]) => {
    const vehicle = emi.loan.vehicle ? ` · ${emi.loan.vehicle.registrationNumber}` : '';
    return `EMI ${emi.installmentNo}/${emi.loan.tenureMonths} of ${inr(Number(emi.emiAmount))} on ${emi.loan.loanName} (${emi.loan.loanNumber}, ${emi.loan.lenderName})${vehicle}`;
  };

  for (const emi of emis) {
    items.push(
      makeItem({
        kind: 'LOAN_EMI',
        entityId: emi.id,
        title: `Loan EMI due — ${emi.loan.loanName}`,
        detail: emiDetail(emi),
        dueDate: emi.dueDate,
        amount: Number(emi.emiAmount),
        today,
        leadDays,
      }),
    );
  }

  for (const emi of overdueEmis) {
    items.push(
      makeItem({
        kind: 'LOAN_EMI_OVERDUE',
        entityId: emi.id,
        title: `Loan EMI OVERDUE — ${emi.loan.loanName}`,
        detail: emiDetail(emi),
        dueDate: emi.dueDate,
        amount: Number(emi.emiAmount),
        today,
        leadDays,
        overdue: true,
      }),
    );
  }

  for (const loan of given) {
    if (!loan.expectedReturnDate) continue;
    const outstanding =
      Number(loan.amount) - loan.repayments.reduce((sum, r) => sum + Number(r.amount), 0);
    if (outstanding <= 0) continue;
    items.push(
      makeItem({
        kind: 'LOAN_GIVEN_RETURN',
        entityId: loan.id,
        title: `Loan given — return due from ${loan.partyName}`,
        detail: `${inr(outstanding)} still to come back from ${loan.partyName} (${loan.referenceNumber})`,
        dueDate: loan.expectedReturnDate,
        amount: outstanding,
        today,
        leadDays,
      }),
    );
  }

  const VEHICLE_DOCS: Array<{
    kind: DueReminderKind;
    field: 'insuranceExpiryDate' | 'permitExpiryDate' | 'fitnessExpiryDate' | 'pucExpiryDate' | 'rcExpiryDate';
    label: string;
  }> = [
    { kind: 'VEHICLE_INSURANCE', field: 'insuranceExpiryDate', label: 'Insurance' },
    { kind: 'VEHICLE_PERMIT', field: 'permitExpiryDate', label: 'Permit' },
    { kind: 'VEHICLE_FITNESS', field: 'fitnessExpiryDate', label: 'Fitness Certificate' },
    { kind: 'VEHICLE_PUC', field: 'pucExpiryDate', label: 'PUC' },
    { kind: 'VEHICLE_RC', field: 'rcExpiryDate', label: 'RC' },
  ];

  for (const vehicle of vehicles) {
    for (const doc of VEHICLE_DOCS) {
      const expiry = vehicle[doc.field];
      // The query matched the vehicle on ANY of the five dates, so each one
      // has to be re-checked against the window individually.
      if (!expiry || expiry < from || expiry > to) continue;
      items.push(
        makeItem({
          kind: doc.kind,
          entityId: vehicle.id,
          title: `${doc.label} expiring — ${vehicle.registrationNumber}`,
          detail: `${doc.label} of ${vehicle.registrationNumber} expires`,
          dueDate: expiry,
          today,
          leadDays,
        }),
      );
    }
  }

  for (const driver of drivers) {
    if (!driver.licenseExpiryDate) continue;
    items.push(
      makeItem({
        kind: 'DRIVER_LICENCE',
        entityId: driver.id,
        title: `Driving licence expiring — ${driver.name}`,
        detail: `Licence ${driver.licenseNumber} of ${driver.name} (${driver.code}) expires`,
        dueDate: driver.licenseExpiryDate,
        today,
        leadDays,
      }),
    );
  }

  for (const service of services) {
    if (!service.nextServiceDueDate) continue;
    items.push(
      makeItem({
        kind: 'VEHICLE_SERVICE',
        entityId: service.id,
        title: `Service due — ${service.vehicle.registrationNumber}`,
        detail: `${service.type} service for ${service.vehicle.registrationNumber} (${service.description})`,
        dueDate: service.nextServiceDueDate,
        today,
        leadDays,
      }),
    );
  }

  for (const cheque of cheques) {
    const issued = cheque.direction === 'ISSUED';
    const party = cheque.payeeOrPayerName
      ? `${issued ? ' to ' : ' from '}${cheque.payeeOrPayerName}`
      : '';
    const bank = cheque.bankAccount.bankName ?? cheque.bankAccount.accountHolderName;
    items.push(
      makeItem({
        kind: 'CHEQUE',
        entityId: cheque.id,
        title: `Cheque ${cheque.chequeNumber} — ${issued ? 'presentation' : 'deposit'} due`,
        detail: `${issued ? 'Issued' : 'Received'} cheque ${cheque.chequeNumber} of ${inr(Number(cheque.amount))}${party} on ${bank}`,
        dueDate: cheque.chequeDate,
        amount: Number(cheque.amount),
        today,
        leadDays,
      }),
    );
  }

  for (const invoice of invoices) {
    if (!invoice.dueDate) continue;
    items.push(
      makeItem({
        kind: 'INVOICE',
        entityId: invoice.id,
        title: `Invoice payment due — ${invoice.invoiceNumber}`,
        detail: `${inr(Number(invoice.outstandingAmount))} outstanding on invoice ${invoice.invoiceNumber} (${invoice.company.name})`,
        dueDate: invoice.dueDate,
        amount: Number(invoice.outstandingAmount),
        today,
        leadDays,
      }),
    );
  }

  return items.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

export interface DueReminderScanResult {
  leadDays: number;
  scanned: number;
  created: number;
  skipped: number;
}

export const dueReminderService = {
  /** How many days ahead to warn. Configurable; 5 unless someone changed it. */
  async leadDays(): Promise<number> {
    const raw = await systemSettingService.get('NOTIFICATION', LEAD_DAYS_SETTING_KEY, String(DEFAULT_LEAD_DAYS));
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_LEAD_DAYS;
    return Math.min(Math.floor(parsed), 90);
  },

  async cronExpression(): Promise<string> {
    return systemSettingService.get('NOTIFICATION', SCAN_CRON_SETTING_KEY, DEFAULT_SCAN_CRON);
  },

  /**
   * Everything falling due inside the window, computed live and written
   * nowhere — what the bell's "Due soon" panel shows. `permissions` filters
   * it to what the caller may see; pass null for an unrestricted
   * (SUPER_ADMIN / internal) view.
   */
  async preview(options?: { leadDays?: number; permissions?: string[] | null }): Promise<{ leadDays: number; items: DueItem[] }> {
    const leadDays = options?.leadDays ?? (await this.leadDays());
    const items = await collect(leadDays);
    const allowed = options?.permissions;
    return {
      leadDays,
      items: allowed ? items.filter((item) => allowed.includes(item.permission)) : items,
    };
  },

  /**
   * The daily scan. Raises one Notification per (reminder, role allowed to
   * see it), skipping anything already raised in the same cycle — so the job
   * can run every day, or twice in a minute, without piling duplicates on
   * anyone.
   */
  async run(options?: { leadDays?: number }): Promise<DueReminderScanResult> {
    const leadDays = options?.leadDays ?? (await this.leadDays());
    const organizationId = await organizationService.resolveOrganizationId(undefined);
    const items = await collect(leadDays);

    if (!items.length) return { leadDays, scanned: 0, created: 0, skipped: 0 };

    const roleIdsByPermission = await dueReminderRepository.roleIdsByPermission([
      ...new Set(items.map((item) => item.permission)),
    ]);

    // One query for every reminder that could possibly suppress one of
    // today's, rather than a lookup per item.
    const earliestCycleStart = items.reduce(
      (earliest, item) => (item.cycleStart < earliest ? item.cycleStart : earliest),
      items[0].cycleStart,
    );
    const existing = await dueReminderRepository.recentReminders(organizationId, ALL_KINDS, earliestCycleStart);
    const lastRaisedAt = new Map<string, Date>();
    for (const row of existing) {
      const key = `${row.roleId}|${row.relatedEntityType}|${row.relatedEntityId}`;
      const previous = lastRaisedAt.get(key);
      if (!previous || row.createdAt > previous) lastRaisedAt.set(key, row.createdAt);
    }

    let created = 0;
    let skipped = 0;

    for (const item of items) {
      const roleIds = roleIdsByPermission.get(item.permission) ?? [];
      for (const roleId of roleIds) {
        const key = `${roleId}|${item.kind}|${item.entityId}`;
        const raisedAt = lastRaisedAt.get(key);
        if (raisedAt && raisedAt >= item.cycleStart) {
          skipped += 1;
          continue;
        }
        await notificationService.send({
          organizationId,
          roleId,
          category: 'REMINDER',
          priority: item.priority,
          title: item.title,
          message: item.message,
          relatedEntityType: item.kind,
          relatedEntityId: item.entityId,
        });
        lastRaisedAt.set(key, new Date());
        created += 1;
      }
    }

    logger.info(
      `Due-date reminder scan: ${items.length} due item(s), ${created} notification(s) raised, ${skipped} already sent`,
    );
    return { leadDays, scanned: items.length, created, skipped };
  },
};
