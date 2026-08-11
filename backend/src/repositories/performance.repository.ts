import { Prisma, TripStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { ReportFilters, dateRangeWhere } from '../utils/reportFilters';

// Bare OPERATIONS/ACCOUNTS roles exist but aren't actually assigned to
// anyone in the seed data — real work is done by the more granular
// sub-roles, so team membership is checked against this realistic set.
export const OPERATIONS_TEAM_ROLES = [
  'OPERATIONS',
  'OPERATION_MANAGER',
  'INTENT_CREATOR',
  'OWN_FLEET_OPERATOR',
  'MARKET_FLEET_OPERATOR',
];
export const ACCOUNTS_TEAM_ROLES = ['ACCOUNTS', 'ACCOUNTING_MANAGER', 'ACCOUNTS_EXECUTIVE'];

const NON_DELAYABLE_TRIP_STATUSES: TripStatus[] = ['COMPLETED', 'CANCELLED', 'DRAFT'];

export interface OperationsPerformance {
  intentsCreated: number;
  tripsCreated: number;
  tripsCompleted: number;
  tripsDelayed: number;
  tripsCancelled: number;
  revenueGenerated: number;
  onTimeDeliveryRate: number;
}

export interface AccountsPerformance {
  invoicesGenerated: number;
  totalInvoiceValue: number;
  receiptsCollected: number;
  totalCollected: number;
  supplierPaymentsProcessed: number;
  totalPaidToSuppliers: number;
}

export const performanceRepository = {
  async getOperationsPerformance(userIds: string[], filters: ReportFilters): Promise<Map<string, OperationsPerformance>> {
    const result = new Map<string, OperationsPerformance>();
    if (userIds.length === 0) return result;

    const [intentCounts, trips] = await Promise.all([
      prisma.intent.groupBy({
        by: ['createdById'],
        where: { createdById: { in: userIds }, deletedAt: null, ...dateRangeWhere('createdAt', filters) },
        _count: true,
      }),
      prisma.trip.findMany({
        where: { createdById: { in: userIds }, deletedAt: null, ...dateRangeWhere('createdAt', filters) },
        select: {
          createdById: true,
          status: true,
          freightAmount: true,
          expectedDeliveryDate: true,
          actualEndDate: true,
        },
      }),
    ]);

    const intentCountByUser = new Map(intentCounts.map((r) => [r.createdById as string, r._count]));
    const now = new Date();

    for (const userId of userIds) {
      const userTrips = trips.filter((t) => t.createdById === userId);
      const completed = userTrips.filter((t) => t.status === 'COMPLETED');
      const cancelled = userTrips.filter((t) => t.status === 'CANCELLED');
      const delayed = userTrips.filter(
        (t) =>
          !NON_DELAYABLE_TRIP_STATUSES.includes(t.status) &&
          t.expectedDeliveryDate &&
          new Date(t.expectedDeliveryDate) < now
      );
      const onTime = completed.filter(
        (t) => t.expectedDeliveryDate && t.actualEndDate && new Date(t.actualEndDate) <= new Date(t.expectedDeliveryDate)
      );

      result.set(userId, {
        intentsCreated: intentCountByUser.get(userId) || 0,
        tripsCreated: userTrips.length,
        tripsCompleted: completed.length,
        tripsDelayed: delayed.length,
        tripsCancelled: cancelled.length,
        revenueGenerated: completed.reduce((sum, t) => sum + Number(t.freightAmount || 0), 0),
        onTimeDeliveryRate: completed.length > 0 ? Math.round((onTime.length / completed.length) * 1000) / 10 : 0,
      });
    }

    return result;
  },

  async getAccountsPerformance(userIds: string[], filters: ReportFilters): Promise<Map<string, AccountsPerformance>> {
    const result = new Map<string, AccountsPerformance>();
    if (userIds.length === 0) return result;

    const [invoices, receipts, payments] = await Promise.all([
      prisma.invoice.groupBy({
        by: ['createdById'],
        where: { createdById: { in: userIds }, deletedAt: null, ...dateRangeWhere('invoiceDate', filters) },
        _count: true,
        _sum: { totalAmount: true },
      }),
      prisma.receipt.groupBy({
        by: ['createdById'],
        where: { createdById: { in: userIds }, deletedAt: null, ...dateRangeWhere('receiptDate', filters) },
        _count: true,
        _sum: { amount: true },
      }),
      prisma.supplierPayment.groupBy({
        by: ['createdById'],
        where: { createdById: { in: userIds }, deletedAt: null, ...dateRangeWhere('paymentDate', filters) },
        _count: true,
        _sum: { amount: true },
      }),
    ]);

    const invoiceMap = new Map(invoices.map((i) => [i.createdById as string, i]));
    const receiptMap = new Map(receipts.map((r) => [r.createdById as string, r]));
    const paymentMap = new Map(payments.map((p) => [p.createdById as string, p]));

    for (const userId of userIds) {
      const inv = invoiceMap.get(userId);
      const rec = receiptMap.get(userId);
      const pay = paymentMap.get(userId);

      result.set(userId, {
        invoicesGenerated: inv?._count || 0,
        totalInvoiceValue: Number(inv?._sum.totalAmount || 0),
        receiptsCollected: rec?._count || 0,
        totalCollected: Number(rec?._sum.amount || 0),
        supplierPaymentsProcessed: pay?._count || 0,
        totalPaidToSuppliers: Number(pay?._sum.amount || 0),
      });
    }

    return result;
  },

  async findTeamUsers(params: {
    team: 'all' | 'operations' | 'accounts';
    search?: string;
    skip: number;
    take: number;
  }) {
    const roleNames =
      params.team === 'operations'
        ? OPERATIONS_TEAM_ROLES
        : params.team === 'accounts'
        ? ACCOUNTS_TEAM_ROLES
        : [...OPERATIONS_TEAM_ROLES, ...ACCOUNTS_TEAM_ROLES];

    const where: Prisma.UserWhereInput = {
      AND: [
        { userRoles: { some: { role: { name: { in: roleNames } } } } },
        params.search
          ? {
              OR: [
                { username: { contains: params.search, mode: 'insensitive' } },
                { fullName: { contains: params.search, mode: 'insensitive' } },
              ],
            }
          : {},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        include: { userRoles: { include: { role: true } } },
        orderBy: { fullName: 'asc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.user.count({ where }),
    ]);

    return { rows, total };
  },
};
