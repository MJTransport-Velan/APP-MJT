<template>
  <div>
    <h2 class="text-h6 mb-4">MIS Dashboard</h2>

    <div v-if="loading" class="d-flex justify-center align-center" style="min-height: 300px">
      <AppProgressCircular indeterminate color="primary" size="48" />
    </div>

    <template v-else-if="summary">
      <div class="row">
        <div class="col-12 col-sm-6 col-md-3"><ProfitCard label="Customer Outstanding" :value="summary.outstanding.customer" icon="mdi-cash-clock" color="warning" /></div>
        <div class="col-12 col-sm-6 col-md-3"><ProfitCard label="Supplier Outstanding" :value="summary.outstanding.supplier" icon="mdi-cash-remove" color="warning" /></div>
        <div class="col-12 col-sm-6 col-md-3"><ProfitCard label="Vehicle Cost (This Month)" :value="summary.vehicleCost" icon="mdi-truck-outline" color="secondary" /></div>
        <div class="col-12 col-sm-6 col-md-3"><ProfitCard label="Driver Cost (This Month)" :value="summary.driverCost" icon="mdi-account-cash-outline" color="secondary" /></div>
      </div>

      <div class="row mt-4">
        <div class="col-12 col-md-6">
          <AppCard class="pa-4">
            <div class="text-subtitle-2 mb-2">Top Customers</div>
            <div v-for="(c, i) in summary.topCustomers" :key="i" class="d-flex justify-space-between text-body-2 mb-1"><span>{{ c.name }}</span><span>{{ formatCurrency(c.amount) }}</span></div>
            <p v-if="summary.topCustomers.length === 0" class="text-caption text-medium-emphasis">No data.</p>
          </AppCard>
        </div>
        <div class="col-12 col-md-6">
          <AppCard class="pa-4">
            <div class="text-subtitle-2 mb-2">Top Suppliers</div>
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
import type { MisDashboardSummary } from '@/types/phase7.types';

const loading = ref(false);
const summary = ref<MisDashboardSummary | null>(null);

onMounted(async () => {
  loading.value = true;
  try {
    summary.value = (await misDashboardApi.get()).data.data;
  } finally {
    loading.value = false;
  }
});
</script>
