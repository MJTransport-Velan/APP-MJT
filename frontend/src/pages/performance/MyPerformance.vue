<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h2 class="text-h6 mb-0">My Performance</h2>
      <AppDateRangePicker
        :from="dateFrom"
        :to="dateTo"
        @update:from="dateFrom = $event"
        @update:to="dateTo = $event"
        @change="load"
      />
    </div>

    <div v-if="store.loading" class="d-flex justify-center align-center" style="min-height: 300px">
      <AppProgressCircular indeterminate color="primary" size="48" />
    </div>

    <template v-else-if="store.summary">
      <p v-if="!store.summary.operations && !store.summary.accounts" class="text-body-2 text-medium-emphasis">
        No performance metrics apply to your account yet — this report tracks work recorded under your user
        (intents/trips for Operations, invoices/receipts/payments for Accounts).
      </p>

      <template v-if="ops">
        <h3 class="section-title">Operations</h3>
        <div class="row mb-2">
          <div class="col-12 col-sm-6 col-md-3">
            <StatCard label="Intents Created" :value="formatNumber(ops.intentsCreated)" icon="mdi-file-document-outline" icon-color="#1E3A8A" icon-bg="rgba(30,58,138,0.1)" />
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <StatCard label="Trips Created" :value="formatNumber(ops.tripsCreated)" icon="mdi-truck-fast-outline" icon-color="#0EA5E9" icon-bg="rgba(14,165,233,0.1)" />
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <StatCard label="Trips Completed" :value="formatNumber(ops.tripsCompleted)" icon="mdi-check-circle-outline" icon-color="#16A34A" icon-bg="rgba(22,163,74,0.1)" />
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <StatCard label="Trips Delayed" :value="formatNumber(ops.tripsDelayed)" icon="mdi-clock-alert-outline" icon-color="#DC2626" icon-bg="rgba(220,38,38,0.1)" />
          </div>
        </div>
        <div class="row mb-4">
          <div class="col-12 col-sm-6 col-md-3">
            <StatCard label="Trips Cancelled" :value="formatNumber(ops.tripsCancelled)" icon="mdi-close-circle-outline" icon-color="#64748B" icon-bg="rgba(100,116,139,0.1)" />
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <StatCard label="Revenue Generated" :value="formatCurrency(ops.revenueGenerated)" icon="mdi-cash-multiple" icon-color="#16A34A" icon-bg="rgba(22,163,74,0.1)" />
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <StatCard label="On-Time Delivery" :value="`${ops.onTimeDeliveryRate}%`" icon="mdi-chart-line" icon-color="#F97316" icon-bg="rgba(249,115,22,0.1)" />
          </div>
        </div>
      </template>

      <template v-if="accounts">
        <h3 class="section-title">Accounts</h3>
        <div class="row mb-2">
          <div class="col-12 col-sm-6 col-md-3">
            <StatCard label="Invoices Generated" :value="formatNumber(accounts.invoicesGenerated)" icon="mdi-receipt-text-outline" icon-color="#1E3A8A" icon-bg="rgba(30,58,138,0.1)" />
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <StatCard label="Total Invoice Value" :value="formatCurrency(accounts.totalInvoiceValue)" icon="mdi-cash-multiple" icon-color="#0EA5E9" icon-bg="rgba(14,165,233,0.1)" />
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <StatCard label="Receipts Collected" :value="formatNumber(accounts.receiptsCollected)" icon="mdi-cash-check" icon-color="#16A34A" icon-bg="rgba(22,163,74,0.1)" />
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <StatCard label="Total Collected" :value="formatCurrency(accounts.totalCollected)" icon="mdi-cash-plus" icon-color="#16A34A" icon-bg="rgba(22,163,74,0.1)" />
          </div>
        </div>
        <div class="row">
          <div class="col-12 col-sm-6 col-md-3">
            <StatCard label="Supplier Payments Processed" :value="formatNumber(accounts.supplierPaymentsProcessed)" icon="mdi-cash-fast" icon-color="#F97316" icon-bg="rgba(249,115,22,0.1)" />
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <StatCard label="Total Paid to Suppliers" :value="formatCurrency(accounts.totalPaidToSuppliers)" icon="mdi-cash-remove" icon-color="#DC2626" icon-bg="rgba(220,38,38,0.1)" />
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useMyPerformanceStore } from '@/stores/performance.store';
import { formatCurrency, formatNumber } from '@/utils/format';
import StatCard from '@/components/StatCard.vue';
import { AppProgressCircular, AppDateRangePicker } from '@/components/ui';

const store = useMyPerformanceStore();

const dateFrom = ref<string | null>(null);
const dateTo = ref<string | null>(null);

const ops = computed(() => store.summary?.operations || null);
const accounts = computed(() => store.summary?.accounts || null);

function load() {
  store.fetchSummary({
    dateFrom: dateFrom.value || undefined,
    dateTo: dateTo.value || undefined,
  });
}

onMounted(load);
</script>

<style scoped>
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 12px;
}
</style>
