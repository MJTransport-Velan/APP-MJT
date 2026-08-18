<template>
  <div>
    <h2 class="text-h6 mb-4">Payroll Dashboard</h2>

    <div v-if="store.loading" class="d-flex justify-center align-center" style="min-height: 300px">
      <AppProgressCircular indeterminate color="primary" size="48" />
    </div>

    <template v-else-if="summary">
      <div class="row">
        <div class="col-12 col-sm-6 col-md-6">
          <ProfitCard label="Pending Advances" :value="summary.pendingAdvances" icon="mdi-cash-clock" color="warning" />
        </div>
        <div class="col-12 col-sm-6 col-md-6">
          <ProfitCard label="Pending Settlements" :value="summary.pendingSettlements" icon="mdi-file-document-outline" color="warning" />
        </div>
      </div>

      <div class="row mt-1">
        <div class="col-12 col-sm-6 col-md-6">
          <ProfitCard label="Outstanding Driver Advances" :value="summary.outstandingDriverAdvances" icon="mdi-account-cash-outline" color="info" />
        </div>
        <div class="col-12 col-sm-6 col-md-6">
          <ProfitCard label="Outstanding Employee Advances" :value="summary.outstandingEmployeeAdvances" icon="mdi-account-cash-outline" color="info" />
        </div>
      </div>

      <div class="row mt-1">
        <div class="col-12 col-sm-6 col-md-3">
          <ProfitCard label="Today's Payments" :value="summary.todaysPayments" icon="mdi-cash-fast" color="success" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { usePayrollDashboardStore } from '@/stores/accounts/driverPayroll';
import ProfitCard from '@/components/accounts/ProfitCard.vue';
import { AppProgressCircular } from '@/components/ui';

const store = usePayrollDashboardStore();
const summary = computed(() => store.summary);

onMounted(() => {
  store.fetchSummary();
});
</script>
