export interface DashboardCards {
  totalTrips: number;
  pendingTrips: number;
  runningTrips: number;
  completedTrips: number;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface DashboardChartSeries {
  categories: string[];
  revenue: number[];
  expenses: number[];
}

export interface DashboardTripChart {
  categories: string[];
  trips: number[];
}

export interface RecentTrip {
  id: string;
  route: string;
  driver: string;
  status: string;
  amount: number;
}

export interface RecentActivity {
  id: string;
  message: string;
  actor: string;
  createdAt: string;
}

export interface DashboardSummary {
  cards: DashboardCards;
  revenueChart: DashboardChartSeries;
  tripChart: DashboardTripChart;
  recentTrips: RecentTrip[];
  recentActivities: RecentActivity[];
}
