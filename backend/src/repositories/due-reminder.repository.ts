import { prisma } from '../config/db';

/**
 * Read-only queries feeding the due-date reminder scan
 * (due-reminder.service.ts). Every one is bounded by the [from, to] window
 * the scanner derives from the configured lead time, so none of them ever
 * walks a whole table, and none of them writes: the scan's only write is
 * the Notification row notificationService.send creates.
 */
export const dueReminderRepository = {
  /** PENDING/OVERDUE EMIs of live loans falling inside the window. */
  loanInstallments(from: Date, to: Date) {
    return prisma.loanInstallment.findMany({
      where: {
        dueDate: { gte: from, lte: to },
        status: { in: ['PENDING', 'OVERDUE'] },
        loan: { status: 'ACTIVE', isActive: true, deletedAt: null },
      },
      select: {
        id: true,
        installmentNo: true,
        dueDate: true,
        emiAmount: true,
        loan: {
          select: {
            id: true,
            loanNumber: true,
            loanName: true,
            lenderName: true,
            tenureMonths: true,
            vehicle: { select: { registrationNumber: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  },

  /** Money lent out and still outstanding, expected back inside the window. */
  loansGiven(from: Date, to: Date) {
    return prisma.loanGiven.findMany({
      where: {
        expectedReturnDate: { gte: from, lte: to },
        status: 'OUTSTANDING',
        deletedAt: null,
      },
      select: {
        id: true,
        referenceNumber: true,
        partyName: true,
        amount: true,
        expectedReturnDate: true,
        repayments: { select: { amount: true } },
      },
      orderBy: { expectedReturnDate: 'asc' },
    });
  },

  /**
   * One row per vehicle with ANY of its five statutory documents expiring
   * inside the window — the caller decides which of the dates actually
   * matched, since a single vehicle can have several expiring at once.
   */
  vehicleDocuments(from: Date, to: Date) {
    const inWindow = { gte: from, lte: to };
    return prisma.vehicle.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        OR: [
          { insuranceExpiryDate: inWindow },
          { permitExpiryDate: inWindow },
          { fitnessExpiryDate: inWindow },
          { pucExpiryDate: inWindow },
          { rcExpiryDate: inWindow },
        ],
      },
      select: {
        id: true,
        registrationNumber: true,
        insuranceExpiryDate: true,
        permitExpiryDate: true,
        fitnessExpiryDate: true,
        pucExpiryDate: true,
        rcExpiryDate: true,
      },
      orderBy: { registrationNumber: 'asc' },
    });
  },

  driverLicences(from: Date, to: Date) {
    return prisma.driver.findMany({
      where: { licenseExpiryDate: { gte: from, lte: to }, isActive: true, deletedAt: null },
      select: { id: true, name: true, code: true, licenseNumber: true, licenseExpiryDate: true },
      orderBy: { licenseExpiryDate: 'asc' },
    });
  },

  /** Next service falling due on a vehicle, from its latest maintenance record. */
  vehicleServices(from: Date, to: Date) {
    return prisma.maintenanceRecord.findMany({
      where: {
        nextServiceDueDate: { gte: from, lte: to },
        deletedAt: null,
        vehicle: { isActive: true, deletedAt: null },
      },
      select: {
        id: true,
        description: true,
        type: true,
        nextServiceDueDate: true,
        vehicle: { select: { id: true, registrationNumber: true } },
      },
      orderBy: { nextServiceDueDate: 'asc' },
    });
  },

  /** Cheques that still have to be presented/deposited on their cheque date. */
  cheques(from: Date, to: Date) {
    return prisma.cheque.findMany({
      where: {
        chequeDate: { gte: from, lte: to },
        status: { in: ['ISSUED', 'RECEIVED', 'DEPOSITED'] },
        deletedAt: null,
      },
      select: {
        id: true,
        chequeNumber: true,
        chequeDate: true,
        direction: true,
        amount: true,
        status: true,
        payeeOrPayerName: true,
        bankAccount: { select: { bankName: true, accountHolderName: true } },
      },
      orderBy: { chequeDate: 'asc' },
    });
  },

  /** Customer invoices with money still outstanding, falling due in the window. */
  invoices(from: Date, to: Date) {
    return prisma.invoice.findMany({
      where: {
        dueDate: { gte: from, lte: to },
        status: { in: ['GENERATED', 'SENT', 'PARTIALLY_PAID'] },
        outstandingAmount: { gt: 0 },
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        invoiceNumber: true,
        dueDate: true,
        outstandingAmount: true,
        company: { select: { name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
  },

  /**
   * Which roles are allowed to see each governing permission. A reminder is
   * addressed to roles, never broadcast: Notification.findForUser only ever
   * matches on userId or roleId, so a row with both null reaches nobody.
   */
  async roleIdsByPermission(permissionNames: string[]): Promise<Map<string, string[]>> {
    const rows = await prisma.rolePermission.findMany({
      where: { permission: { name: { in: permissionNames } } },
      select: { roleId: true, permission: { select: { name: true } } },
    });
    const map = new Map<string, string[]>();
    for (const row of rows) {
      const list = map.get(row.permission.name) ?? [];
      list.push(row.roleId);
      map.set(row.permission.name, list);
    }
    return map;
  },

  /**
   * Reminders already raised since `since`, used to keep the daily scan
   * idempotent — see the cycle-start rule in due-reminder.service.ts.
   */
  recentReminders(organizationId: string, relatedEntityTypes: string[], since: Date) {
    return prisma.notification.findMany({
      where: {
        organizationId,
        category: 'REMINDER',
        relatedEntityType: { in: relatedEntityTypes },
        createdAt: { gte: since },
      },
      select: { roleId: true, relatedEntityType: true, relatedEntityId: true, createdAt: true },
    });
  },
};
