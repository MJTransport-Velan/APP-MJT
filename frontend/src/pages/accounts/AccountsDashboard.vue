<template>
  <div>
    <h2 class="text-h6 mb-4">Accounts Dashboard</h2>

    <div v-if="dashboardStore.loading" class="d-flex justify-center align-center" style="min-height: 300px">
      <AppProgressCircular indeterminate color="primary" size="48" />
    </div>

    <template v-else-if="summary">
      <div class="row">
        <div class="col-12 col-sm-6 col-md-3">
          <ProfitCard label="Outstanding Receivables" :value="summary.outstandingReceivables" icon="mdi-cash-clock" color="warning" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <ProfitCard label="Outstanding Payables" :value="summary.outstandingPayables" icon="mdi-cash-remove" color="error" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <ProfitCard label="Revenue (This Month)" :value="summary.monthlyRevenue" icon="mdi-cash-plus" color="success" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <ProfitCard label="Profit (This Month)" :value="summary.profit" icon="mdi-chart-line" color="primary" color-by-value />
        </div>
      </div>

      <div class="row mt-1">
        <div class="col-12 col-sm-6 col-md-2"><ProfitCard label="Today's Collection" :value="summary.todaysCollection || 0" icon="mdi-cash-fast" color="success" /></div>
        <div class="col-12 col-sm-6 col-md-2"><ProfitCard label="Today's Payment" :value="summary.todaysPayment || 0" icon="mdi-cash-minus" color="error" /></div>
        <div class="col-12 col-sm-6 col-md-2"><ProfitCard label="Overdue Invoices" :value="summary.overdueReceivablesCount || 0" icon="mdi-alert-outline" color="warning" /></div>
        <div class="col-12 col-sm-6 col-md-2"><ProfitCard label="Overdue Bills" :value="summary.overduePayablesCount || 0" icon="mdi-alert-outline" color="warning" /></div>
        <div class="col-12 col-sm-6 col-md-2"><ProfitCard label="Customer Advances" :value="summary.advanceBalance?.customer || 0" icon="mdi-piggy-bank-outline" color="info" /></div>
        <div class="col-12 col-sm-6 col-md-2"><ProfitCard label="Supplier Advances" :value="summary.advanceBalance?.supplier || 0" icon="mdi-piggy-bank-outline" color="info" /></div>
      </div>

      <div v-if="(summary.creditLimitAlerts || []).length" class="row mt-1">
        <div class="col-12">
          <AppCard class="pa-4" elevation="1">
            <h3 class="section-title">Credit Limit Alerts</h3>
            <AppList density="compact">
              <AppListItem v-for="a in summary.creditLimitAlerts" :key="a.companyId">
                <AppListItemTitle class="text-body-2">
                  {{ a.companyName }} —
                  <span v-if="a.reason === 'BLOCKED'" class="text-error">Blocked</span>
                  <span v-else class="text-warning">Over limit ({{ formatCurrency(a.outstanding || 0) }} / {{ formatCurrency(a.limit || 0) }})</span>
                </AppListItemTitle>
              </AppListItem>
            </AppList>
          </AppCard>
        </div>
      </div>

      <div class="row mt-1">
        <div class="col-12 col-md-6">
          <AppCard class="pa-4" elevation="1">
            <h3 class="section-title">Monthly Revenue vs Collection vs Payments</h3>
            <apexchart type="bar" height="260" :options="comparisonOptions" :series="comparisonSeries" />
            <p class="text-caption text-medium-emphasis mt-1">
              Current month snapshot — the backend doesn't provide a historical trend, so this shows this month's figures only.
            </p>
          </AppCard>
        </div>
        <div class="col-12 col-md-6">
          <AppCard class="pa-4" elevation="1">
            <h3 class="section-title">Profit Analysis</h3>
            <apexchart type="donut" height="260" :options="profitOptions" :series="profitSeries" />
          </AppCard>
        </div>
      </div>

      <div class="row mt-1">
        <div class="col-12 col-md-6">
          <OutstandingSummary
            title="Customer Outstanding"
            :rows="summary.customerOutstanding.map((c) => ({ label: c.companyName, amount: c.outstanding }))"
          />
        </div>
        <div class="col-12 col-md-6">
          <OutstandingSummary
            title="Supplier Outstanding"
            :rows="summary.supplierOutstanding.map((s) => ({ label: s.supplierName, amount: s.outstanding }))"
          />
        </div>
      </div>

      <div class="row mt-1">
        <div class="col-12 col-md-6">
          <AppCard class="pa-4" elevation="1">
            <h3 class="section-title">Recent Receipts</h3>
            <AppList density="compact">
              <AppListItem v-for="r in summary.recentReceipts" :key="r.id">
                <AppListItemTitle class="text-body-2">{{ r.company }} — {{ formatCurrency(r.amount) }}</AppListItemTitle>
                <AppListItemSubtitle>{{ r.receiptNumber }} · {{ new Date(r.receiptDate).toLocaleDateString() }}</AppListItemSubtitle>
              </AppListItem>
            </AppList>
            <p v-if="summary.recentReceipts.length === 0" class="text-caption text-medium-emphasis">No recent receipts.</p>
          </AppCard>
        </div>
        <div class="col-12 col-md-6">
          <AppCard class="pa-4" elevation="1">
            <h3 class="section-title">Recent Payments</h3>
            <AppList density="compact">
              <AppListItem v-for="p in summary.recentPayments" :key="p.id">
                <AppListItemTitle class="text-body-2">{{ p.supplier }} — {{ formatCurrency(p.amount) }}</AppListItemTitle>
                <AppListItemSubtitle>{{ p.paymentNumber }} · {{ new Date(p.paymentDate).toLocaleDateString() }}</AppListItemSubtitle>
              </AppListItem>
            </AppList>
            <p v-if="summary.recentPayments.length === 0" class="text-caption text-medium-emphasis">No recent payments.</p>
          </AppCard>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useAccountsDashboardStore } from '@/stores/accounts';
import { formatCurrency } from '@/utils/format';
import ProfitCard from '@/components/accounts/ProfitCard.vue';
import OutstandingSummary from '@/components/accounts/OutstandingSummary.vue';
import {
  AppProgressCircular,
  AppCard,
  AppList,
  AppListItem,
  AppListItemTitle,
  AppListItemSubtitle,
} from '@/components/ui';

const dashboardStore = useAccountsDashboardStore();
const summary = computed(() => dashboardStore.summary);

const comparisonSeries = computed(() => [
  {
    name: 'Amount',
    data: [summary.value?.monthlyRevenue || 0, summary.value?.monthlyRevenue || 0, summary.value?.monthlyExpenses || 0],
  },
]);
const comparisonOptions = {
  chart: { toolbar: { show: false } },
  colors: ['#1E3A8A'],
  plotOptions: { bar: { borderRadius: 6, columnWidth: '45%' } },
  dataLabels: { enabled: false },
  xaxis: { categories: ['Revenue', 'Collection', 'Payments'] },
};

const profitSeries = computed(() => [
  summary.value?.monthlyRevenue || 0,
  summary.value?.monthlyExpenses || 0,
]);
const profitOptions = {
  labels: ['Revenue', 'Expenses'],
  colors: ['#16A34A', '#DC2626'],
  legend: { position: 'bottom' },
};

onMounted(() => {
  dashboardStore.fetchSummary();
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
