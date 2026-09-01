<template>
  <div>
    <h2 class="text-h6 mb-4">MIS Dashboard</h2>

    <DateRangeFilterBar
      :date-from="dateFrom"
      :date-to="dateTo"
      snapshot-note="Customer and supplier outstanding are the running unpaid balance, not a period total."
      @update:date-from="setFrom"
      @update:date-to="setTo"
      @preset="apply"
      @clear="clear"
    />

    <div v-if="loading" class="d-flex justify-center align-center" style="min-height: 300px">
      <AppProgressCircular indeterminate color="primary" size="48" />
    </div>

    <template v-else-if="summary">
      <div class="row">
        <div class="col-12 col-sm-6 col-md-3">
          <ProfitCard label="Customer Outstanding" :value="summary.outstanding.customer" icon="mdi-cash-clock" color="warning" />
          <p v-if="summary.outstanding.openingCustomer > 0" class="text-caption text-medium-emphasis mt-1 mb-0">
            incl. {{ formatCurrency(summary.outstanding.openingCustomer) }} opening
          </p>
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <ProfitCard label="Supplier Outstanding" :value="summary.outstanding.supplier" icon="mdi-cash-remove" color="warning" />
          <p v-if="summary.outstanding.openingSupplier > 0" class="text-caption text-medium-emphasis mt-1 mb-0">
            incl. {{ formatCurrency(summary.outstanding.openingSupplier) }} opening
          </p>
        </div>
        <div class="col-12 col-sm-6 col-md-3"><ProfitCard :label="isActive ? 'Vehicle Cost (Period)' : 'Vehicle Cost (This Month)'" :value="summary.vehicleCost" icon="mdi-truck-outline" color="secondary" /></div>
        <div class="col-12 col-sm-6 col-md-3"><ProfitCard :label="isActive ? 'Driver Cost (Period)' : 'Driver Cost (This Month)'" :value="summary.driverCost" icon="mdi-account-cash-outline" color="secondary" /></div>
      </div>

      <div class="row mt-4">
        <div class="col-12 col-md-6">
          <AppCard class="pa-4">
            <div class="text-subtitle-2 mb-2">Top Customers{{ isActive ? ' (Period)' : '' }}</div>
            <div v-for="(c, i) in summary.topCustomers" :key="i" class="d-flex justify-space-between text-body-2 mb-1"><span>{{ c.name }}</span><span>{{ formatCurrency(c.amount) }}</span></div>
            <p v-if="summary.topCustomers.length === 0" class="text-caption text-medium-emphasis">No data.</p>
          </AppCard>
        </div>
        <div class="col-12 col-md-6">
          <AppCard class="pa-4">
            <div class="text-subtitle-2 mb-2">Top Suppliers{{ isActive ? ' (Period)' : '' }}</div>
            <div v-for="(s, i) in summary.topSuppliers" :key="i" class="d-flex justify-space-between text-body-2 mb-1"><span>{{ s.name }}</span><span>{{ formatCurrency(s.amount) }}</span></div>
            <p v-if="summary.topSuppliers.length === 0" class="text-caption text-medium-emphasis">No data.</p>
          </AppCard>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { misDashboardApi } from '@/services/accounts/financialReporting';
import ProfitCard from '@/components/accounts/ProfitCard.vue';
import { formatCurrency } from '@/utils/format';
import { AppProgressCircular, AppCard } from '@/components/ui';
import { useDateRangeFilter } from '@/composables/useDateRangeFilter';
import { DateRangeFilterBar } from '@/components/filters';
import type { MisDashboardSummary } from '@/types/phase7.types';

const loading = ref(false);
const summary = ref<MisDashboardSummary | null>(null);

const { dateFrom, dateTo, isActive, params, setFrom, setTo, apply, clear } = useDateRangeFilter({ onChange: load });

async function load() {
  loading.value = true;
  try {
    summary.value = (await misDashboardApi.get(params.value)).data.data;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
