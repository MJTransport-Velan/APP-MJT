<template>
  <div>
    <h2 class="text-h6 mb-4">Asset Dashboard</h2>

    <div v-if="store.loading" class="d-flex justify-center align-center" style="min-height: 300px">
      <AppProgressCircular indeterminate color="primary" size="48" />
    </div>

    <template v-else-if="dashboard">
      <div class="row">
        <div class="col-12 col-sm-6 col-md-3">
          <AppCard class="pa-4">
            <div class="text-caption text-medium-emphasis">Total Assets</div>
            <div class="text-h6 font-weight-bold">{{ dashboard.stats.totalAssets }}</div>
          </AppCard>
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <AppCard class="pa-4">
            <div class="text-caption text-medium-emphasis">Active Vehicles</div>
            <div class="text-h6 font-weight-bold">{{ dashboard.stats.activeVehicles }}</div>
          </AppCard>
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <ProfitCard label="Total Vehicle Value" :value="dashboard.stats.totalVehicleValue" icon="mdi-truck-outline" color="primary" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <ProfitCard label="Today's Expenses" :value="dashboard.stats.todaysExpenses" icon="mdi-cash-fast" color="info" />
        </div>
      </div>

      <div class="row mt-4">
        <div class="col-12 col-md-6">
          <AppCard class="pa-4">
            <div class="text-subtitle-2 mb-2">Asset Value by Category</div>
            <div v-if="dashboard.assetsByCategory.length === 0" class="text-caption text-medium-emphasis">No assets registered yet.</div>
            <div class="tblwrap" v-else>
              <AppTable density="compact">
                <thead><tr><th>Category</th><th class="text-right">Assets</th><th class="text-right">Current Value</th></tr></thead>
                <tbody>
                  <tr v-for="(r, idx) in dashboard.assetsByCategory" :key="idx">
                    <td>{{ r.category?.name || '-' }}</td>
                    <td class="text-right">{{ r.assetCount }}</td>
                    <td class="text-right">{{ formatCurrency(r.totalValue) }}</td>
                  </tr>
                </tbody>
              </AppTable>
            </div>
          </AppCard>
        </div>
        <div class="col-12 col-md-6">
          <AppCard class="pa-4">
            <div class="text-subtitle-2 mb-2">Top Expense Vehicles</div>
            <div v-if="dashboard.topExpenseVehicles.length === 0" class="text-caption text-medium-emphasis">No expense data yet.</div>
            <div class="tblwrap" v-else>
              <AppTable density="compact">
                <thead><tr><th>Vehicle</th><th class="text-right">Total Expense</th></tr></thead>
                <tbody>
                  <tr v-for="(r, idx) in dashboard.topExpenseVehicles" :key="idx">
                    <td>{{ r.vehicle?.registrationNumber || '-' }}</td>
                    <td class="text-right">{{ formatCurrency(r.totalExpense) }}</td>
                  </tr>
                </tbody>
              </AppTable>
            </div>
          </AppCard>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useFixedAssetStore } from '@/stores/accounts/vehicleAssets';
import ProfitCard from '@/components/accounts/ProfitCard.vue';
import { formatCurrency } from '@/utils/format';
import { AppProgressCircular, AppCard, AppTable } from '@/components/ui';

const store = useFixedAssetStore();
const dashboard = computed(() => store.dashboard);

onMounted(() => {
  store.fetchDashboard();
});
</script>

<style scoped>
.tblwrap {
  overflow-x: auto;
}
</style>
