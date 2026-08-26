<template>
  <div>
    <h2 class="text-h6 mb-4">Finance Dashboard</h2>

    <div v-if="dashboardStore.loading" class="d-flex justify-center align-center" style="min-height: 300px">
      <AppProgressCircular indeterminate color="primary" size="48" />
    </div>

    <template v-else-if="summary">
      <!-- Where the money is, what is owed, and what we own (spec §3). -->
      <div class="row">
        <div class="col-12 col-sm-6 col-md-3">
          <ProfitCard label="Cash Available" :value="summary.cashAvailable || 0" icon="mdi-cash" color="success" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <ProfitCard label="Bank Available" :value="summary.bankAvailable || 0" icon="mdi-bank-outline" color="success" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <ProfitCard label="Receivables" :value="summary.outstandingReceivables" icon="mdi-cash-clock" color="warning" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <ProfitCard label="Payables" :value="summary.outstandingPayables" icon="mdi-cash-remove" color="error" />
        </div>
      </div>

      <div class="row mt-1">
        <div class="col-12 col-sm-6 col-md-3">
          <ProfitCard label="Loan Outstanding" :value="summary.loanOutstanding || 0" icon="mdi-hand-coin-outline" color="error" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <AppCard class="pa-4">
            <div class="text-caption text-medium-emphasis">Pending EMI</div>
            <div class="text-h6 font-weight-bold">{{ summary.pendingEmiCount || 0 }}</div>
            <div class="text-caption" :class="summary.overdueEmiCount ? 'text-error' : 'text-medium-emphasis'">
              {{ summary.overdueEmiCount || 0 }} overdue{{ summary.overdueEmiAmount ? ' · ' + formatCurrency(summary.overdueEmiAmount) : '' }}
            </div>
          </AppCard>
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <ProfitCard label="Owner Capital" :value="summary.ownerCapital || 0" icon="mdi-wallet-outline" color="primary" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <ProfitCard label="Owner Loan" :value="summary.ownerLoan || 0" icon="mdi-account-cash-outline" color="warning" />
        </div>
      </div>

      <div class="row mt-1">
        <div class="col-12 col-sm-6 col-md-3">
          <ProfitCard label="Total Assets" :value="summary.totalAssets || 0" icon="mdi-scale-balance" color="info" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <ProfitCard label="Profit (This Month)" :value="summary.profit" icon="mdi-chart-line" color="primary" color-by-value />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <ProfitCard label="Revenue (This Month)" :value="summary.monthlyRevenue" icon="mdi-cash-plus" color="success" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <ProfitCard label="Expenses (This Month)" :value="summary.monthlyExpenses" icon="mdi-cash-minus" color="error" />
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

      <!-- Upcoming EMI: the one thing on this page with a deadline. -->
      <div v-if="(summary.upcomingEmis || []).length" class="row mt-1">
        <div class="col-12">
          <AppCard class="pa-4" elevation="1">
            <div class="d-flex align-center justify-space-between mb-2">
              <h3 class="section-title mb-0">Upcoming &amp; Overdue EMI</h3>
              <RouterLink to="/accounts/loans" class="text-caption text-primary">View all</RouterLink>
            </div>
            <div class="tblwrap">
              <AppTable density="compact">
                <thead>
                  <tr><th>Due Date</th><th>Vehicle</th><th>Loan</th><th>Lender</th><th class="text-right">EMI</th><th>Status</th></tr>
                </thead>
                <tbody>
                  <tr v-for="e in summary.upcomingEmis" :key="e.id">
                    <td>{{ formatDate(e.dueDate) }}</td>
                    <td>{{ e.vehicle || '—' }}</td>
                    <td><RouterLink :to="`/accounts/loans/${e.loanId}`" class="text-primary">{{ e.loanNumber }}</RouterLink></td>
                    <td>{{ e.lenderName }}</td>
                    <td class="text-right">{{ formatCurrency(e.emiAmount) }}</td>
                    <td><AppChip size="x-small" :color="e.status === 'OVERDUE' ? 'error' : 'warning'">{{ e.status }}</AppChip></td>
                  </tr>
                </tbody>
              </AppTable>
            </div>
          </AppCard>
        </div>
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
            <h3 class="section-title">Monthly Revenue vs Expenses</h3>
            <apexchart v-if="trends" type="bar" height="260" :options="performanceOptions" :series="performanceSeries" />
            <div v-else class="d-flex justify-center align-center" style="height: 260px">
              <AppProgressCircular indeterminate color="primary" size="32" />
            </div>
            <p class="text-caption text-medium-emphasis mt-1">
              Last 6 months, on the same basis as the Profit &amp; Loss report.
            </p>
          </AppCard>
        </div>
        <div class="col-12 col-md-6">
          <AppCard class="pa-4" elevation="1">
            <h3 class="section-title">EMI Due — Next 6 Months</h3>
            <apexchart v-if="trends" type="bar" height="260" :options="emiOptions" :series="emiSeries" />
            <div v-else class="d-flex justify-center align-center" style="height: 260px">
              <AppProgressCircular indeterminate color="primary" size="32" />
            </div>
            <p class="text-caption text-medium-emphasis mt-1">
              Principal and interest split of every EMI still due on an active loan.
            </p>
          </AppCard>
        </div>
      </div>

      <div class="row mt-1">
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
import { formatCurrency, formatDate } from '@/utils/format';
import ProfitCard from '@/components/accounts/ProfitCard.vue';
import OutstandingSummary from '@/components/accounts/OutstandingSummary.vue';
import {
  AppProgressCircular,
  AppCard,
  AppList,
  AppListItem,
  AppListItemTitle,
  AppListItemSubtitle,
  AppTable,
  AppChip,
} from '@/components/ui';

const dashboardStore = useAccountsDashboardStore();
const summary = computed(() => dashboardStore.summary);
const trends = computed(() => dashboardStore.trends);

// Revenue green / expenses red, matching how those figures are coloured on
// the cards above and on the Profit & Loss report.
const performanceSeries = computed(() => [
  { name: 'Revenue', data: (trends.value?.monthlyPerformance || []).map((m) => m.revenue) },
  { name: 'Expenses', data: (trends.value?.monthlyPerformance || []).map((m) => m.expenses) },
]);
const performanceOptions = computed(() => ({
  chart: { toolbar: { show: false }, stacked: false },
  colors: ['#16A34A', '#DC2626'],
  plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
  dataLabels: { enabled: false },
  legend: { position: 'bottom' },
  xaxis: { categories: (trends.value?.monthlyPerformance || []).map((m) => m.label) },
  yaxis: { labels: { formatter: (v: number) => formatCurrency(v) } },
  tooltip: { y: { formatter: (v: number) => formatCurrency(v) } },
}));

// Stacked, because the useful question is "what does this month's EMI cost
// me, and how much of it actually reduces the loan".
const emiSeries = computed(() => [
  { name: 'Principal', data: (trends.value?.upcomingEmiByMonth || []).map((m) => m.principal) },
  { name: 'Interest', data: (trends.value?.upcomingEmiByMonth || []).map((m) => m.interest) },
]);
const emiOptions = computed(() => ({
  chart: { toolbar: { show: false }, stacked: true },
  colors: ['#1E3A8A', '#F59E0B'],
  plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
  dataLabels: { enabled: false },
  legend: { position: 'bottom' },
  xaxis: { categories: (trends.value?.upcomingEmiByMonth || []).map((m) => m.label) },
  yaxis: { labels: { formatter: (v: number) => formatCurrency(v) } },
  tooltip: { y: { formatter: (v: number) => formatCurrency(v) } },
}));

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
  // Cards first; the trend series runs a Profit & Loss per month and must
  // not delay the figures at the top of the page.
  dashboardStore.fetchSummary();
  dashboardStore.fetchTrends();
});
</script>

<style scoped>
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 12px;
}

.tblwrap {
  overflow-x: auto;
}
</style>
