<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div>
        <h2 class="text-h6 mb-1">Profit &amp; Loss</h2>
        <p class="text-caption text-medium-emphasis mb-0">Income vs Expenses for {{ formatDate(from) }} – {{ formatDate(to) }}</p>
      </div>
      <div class="d-flex flex-wrap align-center ga-2">
        <AppTextField v-model="from" type="date" label="From" density="compact" hide-details style="max-width: 160px" @update:model-value="load" />
        <AppTextField v-model="to" type="date" label="To" density="compact" hide-details style="max-width: 160px" :max="todayStr" @update:model-value="load" />
        <AppBtn variant="outlined" size="small" @click="setThisMonth">This Month</AppBtn>
        <AppBtn variant="outlined" size="small" prepend-icon="mdi-refresh" :loading="loading" @click="load">Refresh</AppBtn>
      </div>
    </div>

    <div v-if="loading && !result" class="d-flex justify-center align-center" style="min-height: 300px">
      <AppProgressCircular indeterminate color="primary" size="48" />
    </div>

    <template v-else-if="result">
      <div class="row mb-4">
        <div class="col-12 col-sm-4"><ProfitCard label="Total Income" :value="result.income.total" icon="mdi-cash-plus" color="success" /></div>
        <div class="col-12 col-sm-4"><ProfitCard label="Total Expenses" :value="result.expenses.total" icon="mdi-cash-minus" color="error" /></div>
        <div class="col-12 col-sm-4">
          <ProfitCard label="Net Profit" :value="result.netProfit" icon="mdi-chart-donut" color="primary" color-by-value />
        </div>
      </div>

      <AppCard class="pa-4 mb-4">
        <div class="d-flex justify-space-between text-caption text-medium-emphasis mb-1">
          <span>Profit Margin</span>
          <span>{{ result.profitMarginPercent.toFixed(1) }}%</span>
        </div>
        <div class="bs-bar">
          <div class="bs-bar__seg" :style="{ width: expensePct + '%', background: 'var(--color-error)' }" :title="`Expenses ${formatCurrency(result.expenses.total)}`" />
          <div v-if="result.netProfit >= 0" class="bs-bar__seg" :style="{ width: profitPct + '%', background: 'var(--color-success)' }" :title="`Net Profit ${formatCurrency(result.netProfit)}`" />
        </div>
        <div v-if="result.netProfit < 0" class="text-caption text-error mt-1">Expenses exceed Income by {{ formatCurrency(-result.netProfit) }}</div>
      </AppCard>

      <div class="row">
        <div class="col-12 col-md-6">
          <AppCard class="pa-4">
            <div class="d-flex align-center justify-space-between mb-1">
              <div class="text-subtitle-1 font-weight-bold">Income</div>
              <div class="text-subtitle-1 font-weight-bold">{{ formatCurrency(result.income.total) }}</div>
            </div>
            <div class="bs-row bs-row--disabled">
              <span>Trip Revenue</span><span class="font-weight-medium">{{ formatCurrency(result.income.tripRevenue) }}</span>
            </div>
            <div class="bs-row bs-row--disabled">
              <span>Other Income (Refunds)</span><span class="font-weight-medium">{{ formatCurrency(result.income.otherIncome) }}</span>
            </div>
            <div class="d-flex justify-space-between font-weight-bold pt-2 mt-1 bs-total-row">
              <span>Total Income</span><span>{{ formatCurrency(result.income.total) }}</span>
            </div>
          </AppCard>
        </div>

        <div class="col-12 col-md-6">
          <AppCard class="pa-4">
            <div class="d-flex align-center justify-space-between mb-1">
              <div class="text-subtitle-1 font-weight-bold">Expenses</div>
              <div class="text-subtitle-1 font-weight-bold">{{ formatCurrency(result.expenses.total) }}</div>
            </div>
            <div class="bs-row" @click="toggle('trip')">
              <span class="d-flex align-center ga-1"><AppIcon icon="mdi-chevron-right" size="small" :style="{ transform: expanded === 'trip' ? 'rotate(90deg)' : 'none' }" /> Trip-related Cost</span>
              <span class="font-weight-medium">{{ formatCurrency(result.expenses.tripRelatedCost.total) }}</span>
            </div>
            <div v-if="expanded === 'trip'" class="bs-detail">
              <div class="d-flex justify-space-between text-body-2 mb-1"><span>Market Vehicle / Supplier Cost</span><span>{{ formatCurrency(result.expenses.tripRelatedCost.supplierCost) }}</span></div>
              <div class="d-flex justify-space-between text-body-2 mb-1"><span>Manual Trip Expenses</span><span>{{ formatCurrency(result.expenses.tripRelatedCost.manualTripExpenses) }}</span></div>
            </div>

            <div class="bs-row" @click="toggle('vehicle')">
              <span class="d-flex align-center ga-1"><AppIcon icon="mdi-chevron-right" size="small" :style="{ transform: expanded === 'vehicle' ? 'rotate(90deg)' : 'none' }" /> Vehicle Operating Cost</span>
              <span class="font-weight-medium">{{ formatCurrency(result.expenses.vehicleOperatingCost.total) }}</span>
            </div>
            <div v-if="expanded === 'vehicle'" class="bs-detail">
              <div v-for="row in vehicleCostRows" :key="row.label" class="d-flex justify-space-between text-body-2 mb-1"><span>{{ row.label }}</span><span>{{ formatCurrency(row.value) }}</span></div>
            </div>

            <div class="bs-row bs-row--disabled">
              <span>Office Expenses</span><span class="font-weight-medium">{{ formatCurrency(result.expenses.officeExpenses) }}</span>
            </div>
            <div class="bs-row bs-row--disabled">
              <span>Staff Salary</span><span class="font-weight-medium">{{ formatCurrency(result.expenses.staffSalary) }}</span>
            </div>
            <div class="d-flex justify-space-between font-weight-bold pt-2 mt-1 bs-total-row">
              <span>Total Expenses</span><span>{{ formatCurrency(result.expenses.total) }}</span>
            </div>
          </AppCard>
        </div>
      </div>

      <AppCard class="pa-4 mt-4">
        <div class="text-subtitle-2 mb-2">Notes &amp; Limitations</div>
        <ul class="bs-notes">
          <li v-for="(note, i) in result.limitations" :key="i">{{ note }}</li>
        </ul>
      </AppCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { profitLossApi } from '@/services/accounts/profitLoss';
import { formatCurrency, localDateStr } from '@/utils/format';
import { useSnackbar } from '@/composables/useSnackbar';
import ProfitCard from '@/components/accounts/ProfitCard.vue';
import { AppCard, AppBtn, AppTextField, AppProgressCircular, AppIcon } from '@/components/ui';
import type { ProfitLossResult } from '@/types/profitLoss.types';

const { error: showError } = useSnackbar();

const todayStr = localDateStr();
const now = new Date();
const from = ref(localDateStr(new Date(now.getFullYear(), now.getMonth(), 1)));
const to = ref(todayStr);
const loading = ref(false);
const result = ref<ProfitLossResult | null>(null);
const expanded = ref<string | null>(null);

function toggle(key: string) {
  expanded.value = expanded.value === key ? null : key;
}
function formatDate(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function setThisMonth() {
  from.value = localDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
  to.value = todayStr;
  load();
}

const vehicleCostRows = computed(() => {
  if (!result.value) return [];
  const c = result.value.expenses.vehicleOperatingCost;
  return [
    { label: 'Diesel / Fuel', value: c.diesel },
    { label: 'FASTag', value: c.fastTag },
    { label: 'Repairs & Maintenance', value: c.repairs },
    { label: 'Insurance', value: c.insurance },
    { label: 'Tyres', value: c.tyres },
    { label: 'Battery', value: c.battery },
    { label: 'Driver Salary', value: c.driverSalary },
    { label: 'Other', value: c.other },
  ].filter((r) => r.value > 0.004);
});

const expensePct = computed(() => {
  if (!result.value || result.value.income.total <= 0) return 0;
  return Math.min((result.value.expenses.total / result.value.income.total) * 100, 100);
});
const profitPct = computed(() => {
  if (!result.value || result.value.income.total <= 0) return 0;
  return Math.max(100 - expensePct.value, 0);
});

async function load() {
  loading.value = true;
  try {
    result.value = (await profitLossApi.get(from.value, to.value)).data.data;
  } catch (e) {
    showError('Failed to load Profit & Loss report');
  } finally {
    loading.value = false;
  }
}

load();
</script>

<style scoped>
.bs-bar {
  height: 18px;
  border-radius: 9px;
  background: color-mix(in srgb, var(--color-success) 22%, transparent);
  overflow: hidden;
  display: flex;
}
.bs-bar__seg {
  height: 100%;
}
.bs-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 4px;
  cursor: pointer;
  border-bottom: 1px solid var(--color-border, #eef0f2);
  transition: background 0.12s ease;
}
.bs-row:hover {
  background: var(--color-surface-variant, #f5f7fa);
}
.bs-row--disabled {
  cursor: default;
}
.bs-row--disabled:hover {
  background: transparent;
}
.bs-detail {
  padding: 4px 8px 12px 24px;
  background: var(--color-surface-variant, #fafafa);
  border-radius: 6px;
  margin-bottom: 4px;
}
.bs-total-row {
  border-top: 1px solid var(--color-border, #e5e7eb);
}
.bs-notes {
  padding-left: 18px;
  margin: 0;
}
.bs-notes li {
  font-size: 12px;
  color: var(--color-text-medium-emphasis, #666);
  margin-bottom: 6px;
}
</style>
