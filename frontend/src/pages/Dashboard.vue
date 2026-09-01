<template>
  <div>
    <DateRangeFilterBar
      :date-from="dateFrom"
      :date-to="dateTo"
      snapshot-note="Trip counts, money figures, both charts and the recent lists all follow this window."
      @update:date-from="setFrom"
      @update:date-to="setTo"
      @preset="apply"
      @clear="clear"
    />

    <div v-if="dashboardStore.loading" class="d-flex justify-center align-center" style="min-height: 300px">
      <AppProgressCircular indeterminate color="primary" size="48" />
    </div>

    <template v-else-if="dashboardStore.summary">
      <div class="row">
        <div class="col-12 col-sm-6 col-md-3">
          <StatCard label="Total Trips" :value="formatNumber(cards.totalTrips)" icon="mdi-truck-fast-outline" icon-color="#1E3A8A" icon-bg="rgba(30,58,138,0.1)" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <StatCard label="Pending Trips" :value="formatNumber(cards.pendingTrips)" icon="mdi-clock-outline" icon-color="#F59E0B" icon-bg="rgba(245,158,11,0.12)" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <StatCard label="Running Trips" :value="formatNumber(cards.runningTrips)" icon="mdi-map-marker-path" icon-color="#0EA5E9" icon-bg="rgba(14,165,233,0.12)" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <StatCard label="Completed Trips" :value="formatNumber(cards.completedTrips)" icon="mdi-check-circle-outline" icon-color="#16A34A" icon-bg="rgba(22,163,74,0.12)" />
        </div>
      </div>

      <div class="row mt-1">
        <div class="col-12 col-sm-4">
          <StatCard label="Revenue" :value="formatCurrency(cards.revenue)" icon="mdi-cash-plus" icon-color="#16A34A" icon-bg="rgba(22,163,74,0.12)" />
        </div>
        <div class="col-12 col-sm-4">
          <StatCard label="Expenses" :value="formatCurrency(cards.expenses)" icon="mdi-cash-minus" icon-color="#DC2626" icon-bg="rgba(220,38,38,0.12)" />
        </div>
        <div class="col-12 col-sm-4">
          <StatCard label="Profit" :value="formatCurrency(cards.profit)" icon="mdi-chart-line" icon-color="#F97316" icon-bg="rgba(249,115,22,0.12)" />
        </div>
      </div>

      <div class="row mt-1">
        <div class="col-12 col-md-7">
          <AppCard class="pa-4" elevation="1">
            <h3 class="section-title">Revenue vs Expenses</h3>
            <apexchart type="area" height="300" :options="revenueChartOptions" :series="revenueChartSeries" />
          </AppCard>
        </div>
        <div class="col-12 col-md-5">
          <AppCard class="pa-4" elevation="1">
            <h3 class="section-title">{{ isActive ? 'Trips in Period' : 'Trips This Week' }}</h3>
            <apexchart type="bar" height="300" :options="tripChartOptions" :series="tripChartSeries" />
          </AppCard>
        </div>
      </div>

      <div class="row mt-1">
        <div class="col-12 col-md-8">
          <AppCard class="pa-4" elevation="1">
            <h3 class="section-title">Recent Trips</h3>
            <AppTable>
              <thead>
                <tr>
                  <th>Trip ID</th>
                  <th>Route</th>
                  <th>Driver</th>
                  <th>Status</th>
                  <th class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="trip in dashboardStore.summary.recentTrips" :key="trip.id">
                  <td>{{ trip.id }}</td>
                  <td>{{ trip.route }}</td>
                  <td>{{ trip.driver }}</td>
                  <td>
                    <AppChip size="small" :color="statusColor(trip.status)" variant="flat">{{ trip.status }}</AppChip>
                  </td>
                  <td class="text-right">{{ formatCurrency(trip.amount) }}</td>
                </tr>
              </tbody>
            </AppTable>
          </AppCard>
        </div>

        <div class="col-12 col-md-4">
          <AppCard class="pa-4" elevation="1">
            <h3 class="section-title">Recent Activities</h3>
            <AppList density="compact">
              <AppListItem v-for="activity in dashboardStore.summary.recentActivities" :key="activity.id">
                <template #prepend>
                  <AppIcon icon="mdi-circle-medium" color="primary" />
                </template>
                <AppListItemTitle class="text-body-2">{{ activity.message }}</AppListItemTitle>
                <AppListItemSubtitle>{{ activity.actor }} · {{ formatRelativeTime(activity.createdAt) }}</AppListItemSubtitle>
              </AppListItem>
            </AppList>
          </AppCard>
        </div>
      </div>
    </template>

    <AppAlert v-else-if="dashboardStore.error" type="error" variant="tonal">
      {{ dashboardStore.error }}
    </AppAlert>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useDashboardStore } from '@/stores/dashboard.store';
import { useDateRangeFilter } from '@/composables/useDateRangeFilter';
import { DateRangeFilterBar } from '@/components/filters';
import { formatCurrency, formatNumber, formatRelativeTime } from '@/utils/format';
import { useTheme } from '@/composables/useTheme';
import StatCard from '@/components/StatCard.vue';
import {
  AppProgressCircular,
  AppCard,
  AppTable,
  AppChip,
  AppList,
  AppListItem,
  AppIcon,
  AppListItemTitle,
  AppListItemSubtitle,
  AppAlert,
} from '@/components/ui';

const dashboardStore = useDashboardStore();
const { isDark } = useTheme();

const { dateFrom, dateTo, isActive, params, setFrom, setTo, apply, clear } = useDateRangeFilter({ onChange: load });

function load() {
  dashboardStore.fetchSummary(params.value);
}

onMounted(load);

const cards = computed(() => dashboardStore.summary!.cards);

const chartTheme = computed(() => ({
  mode: isDark.value ? 'dark' : 'light',
  foreColor: isDark.value ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
  gridBorderColor: isDark.value ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
}));

const revenueChartSeries = computed(() => [
  { name: 'Revenue', data: dashboardStore.summary?.revenueChart.revenue || [] },
  { name: 'Expenses', data: dashboardStore.summary?.revenueChart.expenses || [] },
]);

const revenueChartOptions = computed(() => ({
  chart: { toolbar: { show: false }, foreColor: chartTheme.value.foreColor },
  theme: { mode: chartTheme.value.mode },
  colors: ['#1E3A8A', '#F97316'],
  dataLabels: { enabled: false },
  stroke: { curve: 'smooth', width: 2 },
  grid: { borderColor: chartTheme.value.gridBorderColor },
  xaxis: { categories: dashboardStore.summary?.revenueChart.categories || [] },
  legend: { position: 'top', labels: { colors: chartTheme.value.foreColor } },
}));

const tripChartSeries = computed(() => [
  { name: 'Trips', data: dashboardStore.summary?.tripChart.trips || [] },
]);

const tripChartOptions = computed(() => ({
  chart: { toolbar: { show: false }, foreColor: chartTheme.value.foreColor },
  theme: { mode: chartTheme.value.mode },
  colors: ['#1E3A8A'],
  plotOptions: { bar: { borderRadius: 6, columnWidth: '45%' } },
  dataLabels: { enabled: false },
  grid: { borderColor: chartTheme.value.gridBorderColor },
  xaxis: { categories: dashboardStore.summary?.tripChart.categories || [] },
}));

function statusColor(status: string) {
  switch (status) {
    case 'Completed':
      return 'success';
    case 'Running':
      return 'info';
    case 'Pending':
      return 'warning';
    default:
      return 'default';
  }
}
</script>

<style scoped>
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 12px;
}
</style>
