<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6">Profitability Reports</h2>
      <div class="d-flex ga-2">
        <AppTextField v-model="from" type="date" label="From" density="compact" hide-details style="max-width: 160px" @update:model-value="fetchActive" />
        <AppTextField v-model="to" type="date" label="To" density="compact" hide-details style="max-width: 160px" @update:model-value="fetchActive" />
      </div>
    </div>

    <AppTabs v-model="activeTab" color="primary" class="mb-4">
      <AppTab value="customer">Customer</AppTab>
      <AppTab value="supplier">Supplier</AppTab>
      <AppTab value="vehicle">Vehicle</AppTab>
      <AppTab value="driver">Driver</AppTab>
      <AppTab value="route">Route</AppTab>
    </AppTabs>

    <AppCard>
      <div class="tblwrap">
        <AppTable density="compact">
          <thead>
            <tr>
              <th>{{ labelFor(activeTab) }}</th>
              <th class="text-right">Trips</th>
              <th class="text-right">Revenue</th>
              <th class="text-right">Costs</th>
              <th class="text-right">Profit</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in result?.rows || []" :key="r.key">
              <td>{{ r.label }}</td>
              <td class="text-right">{{ r.tripCount ?? '-' }}</td>
              <td class="text-right">{{ formatCurrency(r.revenue) }}</td>
              <td class="text-right">{{ formatCurrency((r.tripExpense || 0) + (r.supplierCharge || 0) + (r.driverCost || 0)) }}</td>
              <td class="text-right" :class="r.profit >= 0 ? 'text-success' : 'text-error'">{{ formatCurrency(r.profit) }}</td>
            </tr>
          </tbody>
        </AppTable>
      </div>
      <p v-if="result && result.rows.length === 0" class="text-caption text-medium-emphasis pa-4">No data for this period.</p>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { profitabilityReportApi } from '@/services/accounts/financialReporting';
import { formatCurrency } from '@/utils/format';
import { AppTabs, AppTab, AppCard, AppTable, AppTextField } from '@/components/ui';
import type { ProfitabilityResult } from '@/types/phase7.types';

const activeTab = ref('customer');
const now = new Date();
const from = ref(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
const to = ref(now.toISOString().slice(0, 10));
const result = ref<ProfitabilityResult | null>(null);

const labels: Record<string, string> = { customer: 'Customer', supplier: 'Supplier', vehicle: 'Vehicle', driver: 'Driver', route: 'Route' };
function labelFor(tab: string) { return labels[tab] || tab; }

async function fetchActive() {
  const params = { from: from.value, to: to.value };
  const apiMap: Record<string, () => ReturnType<typeof profitabilityReportApi.customer>> = {
    customer: () => profitabilityReportApi.customer(params),
    supplier: () => profitabilityReportApi.supplier(params),
    vehicle: () => profitabilityReportApi.vehicle(params),
    driver: () => profitabilityReportApi.driver(params),
    route: () => profitabilityReportApi.route(params),
  };
  result.value = (await apiMap[activeTab.value]()).data.data;
}

watch(activeTab, fetchActive);
onMounted(fetchActive);
</script>

<style scoped>
.tblwrap {
  overflow-x: auto;
}
</style>
