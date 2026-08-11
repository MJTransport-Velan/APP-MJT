import { auditService } from './audit.service';

export const dashboardService = {
  async getSummary() {
    // NOTE: The cards/charts below are base/demo data for the ERP scaffold,
    // superseded by the real MIS Dashboard (Phase 13, docs Phase 7) and
    // the Dashboard Engine's operations widgets — this endpoint is kept
    // only as the top-nav landing summary. recentActivities is real,
    // pulled from the Audit Service (previously a hardcoded array).
    const recentActivities = await auditService.recentActivity(6);
    return {
      cards: {
        totalTrips: 428,
        pendingTrips: 36,
        runningTrips: 12,
        completedTrips: 380,
        revenue: 1875000,
        expenses: 1120000,
        profit: 755000,
      },
      revenueChart: {
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        revenue: [210000, 245000, 198000, 265000, 310000, 320000],
        expenses: [140000, 155000, 132000, 168000, 190000, 210000],
      },
      tripChart: {
        categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        trips: [22, 28, 19, 31, 26, 15, 9],
      },
      recentTrips: [
        { id: 'TRP-1042', route: 'Chennai -> Coimbatore', driver: 'R. Kumar', status: 'Completed', amount: 18500 },
        { id: 'TRP-1041', route: 'Bangalore -> Hyderabad', driver: 'S. Rao', status: 'Running', amount: 24500 },
        { id: 'TRP-1040', route: 'Mumbai -> Pune', driver: 'A. Sharma', status: 'Pending', amount: 9800 },
        { id: 'TRP-1039', route: 'Delhi -> Jaipur', driver: 'V. Singh', status: 'Completed', amount: 16200 },
        { id: 'TRP-1038', route: 'Coimbatore -> Madurai', driver: 'M. Pillai', status: 'Completed', amount: 8700 },
      ],
      recentActivities,
    };
  },
};
