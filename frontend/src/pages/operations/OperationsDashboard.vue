<template>
  <div>
    <h2 class="text-h6 mb-4">Operations Dashboard</h2>

    <div v-if="dashboardStore.loading" class="d-flex justify-center align-center" style="min-height: 300px">
      <AppProgressCircular indeterminate color="primary" size="48" />
    </div>

    <template v-else-if="dashboardStore.summary">
      <div class="row">
        <div class="col-12 col-sm-6 col-md-3">
          <FuelSummaryCard label="Pending Intents" :value="formatNumber(summary.intentSummary.pending)" icon="mdi-file-clock-outline" color="warning" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <FuelSummaryCard label="Approved Intents" :value="formatNumber(summary.intentSummary.approved)" icon="mdi-file-check-outline" color="success" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <FuelSummaryCard label="Trips Running" :value="formatNumber(summary.tripSummary.running)" icon="mdi-truck-fast-outline" color="info" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <FuelSummaryCard label="Trips Completed" :value="formatNumber(summary.tripSummary.completed)" icon="mdi-check-circle-outline" color="success" />
        </div>
      </div>

      <div class="row mt-1">
        <div class="col-12 col-sm-6 col-md-3">
          <ExpenseSummaryCard label="Delayed Trips" :value="formatNumber(summary.tripSummary.delayed)" icon="mdi-clock-alert-outline" color="error" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <ExpenseSummaryCard label="Own Fleet Trips" :value="formatNumber(summary.fleetMixSummary.ownFleetTrips)" icon="mdi-truck-outline" color="primary" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <ExpenseSummaryCard label="Supplier Trips" :value="formatNumber(summary.fleetMixSummary.supplierTrips)" icon="mdi-account-tie-outline" color="secondary" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <ExpenseSummaryCard label="Revenue (This Month)" :value="formatCurrency(summary.revenueSummary.totalFreightRevenue)" icon="mdi-cash-multiple" color="success" />
        </div>
      </div>

      <div class="row mt-1">
        <div class="col-12 col-md-5">
          <AppCard class="pa-4 elevation-1">
            <h3 class="section-title">Trip Status</h3>
            <apexchart type="donut" height="260" :options="statusChartOptions" :series="statusChartSeries" />
          </AppCard>
        </div>
        <div class="col-12 col-md-7">
          <AppCard class="pa-4 elevation-1">
            <h3 class="section-title">Trips by Customer</h3>
            <apexchart type="bar" height="260" :options="customerChartOptions" :series="customerChartSeries" />
            <p class="text-caption text-medium-emphasis mt-1">
              Computed from the most recent 200 trips (no dedicated backend aggregate exists for this breakdown).
            </p>
          </AppCard>
        </div>
      </div>

      <div class="row mt-1">
        <div class="col-12 col-md-7">
          <AppCard class="pa-4 elevation-1">
            <h3 class="section-title">Trips by Route</h3>
            <apexchart type="bar" height="260" :options="routeChartOptions" :series="routeChartSeries" />
          </AppCard>
        </div>
        <div class="col-12 col-md-5">
          <AppCard class="pa-4 elevation-1">
            <h3 class="section-title">Delayed Trips — Recent Activity</h3>
            <AppList>
              <AppListItem v-for="trip in summary.delayedTrips" :key="trip.id">
                <AppListItemTitle class="text-body-2">{{ trip.tripNumber }}</AppListItemTitle>
                <AppListItemSubtitle>
                  {{ trip.status }} · due
                  {{ trip.expectedDeliveryDate ? new Date(trip.expectedDeliveryDate).toLocaleDateString() : '-' }}
                </AppListItemSubtitle>
              </AppListItem>
            </AppList>
            <p v-if="summary.delayedTrips.length === 0" class="text-caption text-medium-emphasis">No delayed trips.</p>
          </AppCard>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useOperationsDashboardStore } from '@/stores/operations';
import { tripApi } from '@/services/operations';
import { formatCurrency, formatNumber } from '@/utils/format';
import FuelSummaryCard from '@/components/fleet/FuelSummaryCard.vue';
import ExpenseSummaryCard from '@/components/fleet/ExpenseSummaryCard.vue';
import {
  AppProgressCircular,
  AppCard,
  AppList,
  AppListItem,
  AppListItemTitle,
  AppListItemSubtitle,
} from '@/components/ui';
import type { Trip } from '@/types/operations.types';

const dashboardStore = useOperationsDashboardStore();
const summary = computed(() => dashboardStore.summary!);

// Trips by Customer / Route / Status breakdown: the backend dashboard
// summary doesn't expose these aggregates, so they're computed here from
// a bounded recent-trips fetch rather than inventing a new API.
const recentTrips = ref<Trip[]>([]);

const statusChartSeries = computed(() => {
  const counts = new Map<string, number>();
  recentTrips.value.forEach((t) => counts.set(t.status, (counts.get(t.status) || 0) + 1));
  return Array.from(counts.values());
});
const statusChartOptions = computed(() => {
  const counts = new Map<string, number>();
  recentTrips.value.forEach((t) => counts.set(t.status, (counts.get(t.status) || 0) + 1));
  return {
    labels: Array.from(counts.keys()),
    legend: { position: 'bottom' },
  };
});

const customerChartSeries = computed(() => {
  const counts = new Map<string, number>();
  recentTrips.value.forEach((t) => {
    const name = t.intent.company.name;
    counts.set(name, (counts.get(name) || 0) + 1);
  });
  return [{ name: 'Trips', data: Array.from(counts.values()) }];
});
const customerChartOptions = computed(() => {
  const counts = new Map<string, number>();
  recentTrips.value.forEach((t) => {
    const name = t.intent.company.name;
    counts.set(name, (counts.get(name) || 0) + 1);
  });
  return {
    chart: { toolbar: { show: false } },
    colors: ['#1E3A8A'],
    plotOptions: { bar: { borderRadius: 6, columnWidth: '45%' } },
    dataLabels: { enabled: false },
    xaxis: { categories: Array.from(counts.keys()) },
  };
});

const routeChartSeries = computed(() => {
  const counts = new Map<string, number>();
  recentTrips.value.forEach((t) => {
    const label = `${t.fromLocation.name} → ${t.toLocation.name}`;
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  return [{ name: 'Trips', data: Array.from(counts.values()) }];
});
const routeChartOptions = computed(() => {
  const counts = new Map<string, number>();
  recentTrips.value.forEach((t) => {
    const label = `${t.fromLocation.name} → ${t.toLocation.name}`;
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  return {
    chart: { toolbar: { show: false } },
    colors: ['#F97316'],
    plotOptions: { bar: { borderRadius: 6, columnWidth: '45%', horizontal: true } },
    dataLabels: { enabled: false },
    xaxis: { categories: Array.from(counts.keys()) },
  };
});

onMounted(async () => {
  await dashboardStore.fetchSummary();
  const response = await tripApi.list({ pageSize: 200 });
  recentTrips.value = response.data.data;
});
</script>

<style scoped>
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 12px;
}
</style>
