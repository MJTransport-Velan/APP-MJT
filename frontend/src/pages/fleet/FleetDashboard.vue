<template>
  <div>
    <h2 class="text-h6 mb-4">Fleet Dashboard</h2>

    <div v-if="dashboardStore.loading" class="d-flex justify-center align-center" style="min-height: 300px">
      <AppProgressCircular indeterminate color="primary" size="48" />
    </div>

    <template v-else-if="dashboardStore.summary">
      <div class="row">
        <div class="col-12 col-sm-6 col-md-3">
          <FuelSummaryCard label="Total Vehicles" :value="formatNumber(summary.fleetSummary.totalVehicles)" icon="mdi-truck-outline" color="primary" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <FuelSummaryCard label="Available Vehicles" :value="formatNumber(summary.statusSummary.available)" icon="mdi-check-circle-outline" color="success" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <FuelSummaryCard label="Vehicles on Trip" :value="formatNumber(summary.statusSummary.running)" icon="mdi-map-marker-path" color="info" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <FuelSummaryCard label="Under Maintenance" :value="formatNumber(summary.statusSummary.underMaintenance)" icon="mdi-wrench-outline" color="warning" />
        </div>
      </div>

      <div class="row mt-1">
        <div class="col-12 col-sm-6 col-md-3">
          <ExpenseSummaryCard label="Expiring Documents" :value="formatNumber(summary.documentExpirySummary.length)" icon="mdi-file-alert-outline" color="error" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <ExpenseSummaryCard label="Fuel Cost (Month)" :value="formatCurrency(summary.costSummary.fuelCost)" icon="mdi-gas-station-outline" color="info" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <ExpenseSummaryCard label="Maintenance Cost (Month)" :value="formatCurrency(summary.costSummary.maintenanceCost)" icon="mdi-wrench-outline" color="warning" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <ExpenseSummaryCard label="Monthly Expenses" :value="formatCurrency(totalMonthlyExpense)" icon="mdi-cash-multiple" color="primary" />
        </div>
      </div>

      <div class="row mt-1">
        <div class="col-12 col-md-6">
          <AppCard class="pa-4" elevation="1">
            <h3 class="section-title">Fleet Utilization</h3>
            <apexchart type="donut" height="280" :options="utilizationOptions" :series="utilizationSeries" />
          </AppCard>
        </div>
        <div class="col-12 col-md-6">
          <AppCard class="pa-4" elevation="1">
            <h3 class="section-title">Expense Analysis (This Month)</h3>
            <apexchart type="bar" height="280" :options="expenseOptions" :series="expenseSeries" />
          </AppCard>
        </div>
      </div>

      <div class="row mt-1">
        <div class="col-12 col-md-7">
          <AppCard class="pa-4" elevation="1">
            <h3 class="section-title">Document Expiry</h3>
            <AppTable>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Insurance</th>
                  <th>Permit</th>
                  <th>Fitness</th>
                  <th>PUC</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="doc in summary.documentExpirySummary" :key="doc.vehicleId">
                  <td>{{ doc.registrationNumber }}</td>
                  <td><DocumentExpiryChip :date="doc.insuranceExpiryDate" /></td>
                  <td><DocumentExpiryChip :date="doc.permitExpiryDate" /></td>
                  <td><DocumentExpiryChip :date="doc.fitnessExpiryDate" /></td>
                  <td><DocumentExpiryChip :date="doc.pucExpiryDate" /></td>
                </tr>
              </tbody>
            </AppTable>
            <p v-if="summary.documentExpirySummary.length === 0" class="text-caption text-medium-emphasis mt-2">
              No documents expiring in the next 30 days.
            </p>
          </AppCard>
        </div>

        <div class="col-12 col-md-5">
          <AppCard class="pa-4" elevation="1">
            <h3 class="section-title">Recent Activity — Upcoming Service</h3>
            <MaintenanceTimeline :records="upcomingMaintenance" />
          </AppCard>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useFleetDashboardStore, useMaintenanceStore } from '@/stores/fleet';
import { formatCurrency, formatNumber } from '@/utils/format';
import FuelSummaryCard from '@/components/fleet/FuelSummaryCard.vue';
import ExpenseSummaryCard from '@/components/fleet/ExpenseSummaryCard.vue';
import DocumentExpiryChip from '@/components/fleet/DocumentExpiryChip.vue';
import MaintenanceTimeline from '@/components/fleet/MaintenanceTimeline.vue';
import { AppProgressCircular, AppCard, AppTable } from '@/components/ui';

const dashboardStore = useFleetDashboardStore();
const maintenanceStore = useMaintenanceStore();

const summary = computed(() => dashboardStore.summary!);
const upcomingMaintenance = computed(() => maintenanceStore.upcomingDue);

const totalMonthlyExpense = computed(() =>
  (dashboardStore.summary?.costSummary.byCategory || []).reduce((sum, c) => sum + Number(c.total), 0)
);

const utilizationSeries = computed(() => {
  const s = dashboardStore.summary?.statusSummary;
  return s ? [s.available, s.running, s.underMaintenance, s.inactive] : [];
});
const utilizationOptions = computed(() => ({
  labels: ['Available', 'Running', 'Under Maintenance', 'Inactive'],
  colors: ['#16A34A', '#0EA5E9', '#F59E0B', '#94A3B8'],
  legend: { position: 'bottom' },
}));

const expenseSeries = computed(() => [
  { name: 'Amount', data: (dashboardStore.summary?.costSummary.byCategory || []).map((c) => Number(c.total)) },
]);
const expenseOptions = computed(() => ({
  chart: { toolbar: { show: false } },
  colors: ['#1E3A8A'],
  plotOptions: { bar: { borderRadius: 6, columnWidth: '45%' } },
  dataLabels: { enabled: false },
  xaxis: { categories: (dashboardStore.summary?.costSummary.byCategory || []).map((c) => c.category) },
}));

onMounted(async () => {
  await Promise.all([dashboardStore.fetchSummary(), maintenanceStore.fetchUpcomingDue()]);
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
