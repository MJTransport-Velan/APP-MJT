<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div>
        <h2 class="text-h6 mb-1">Team Performance</h2>
        <p class="text-caption text-medium-emphasis mb-0">Operations and Accounts team performance, per user</p>
      </div>
      <div class="d-flex flex-wrap align-center ga-2">
        <AppTextField v-model="search" placeholder="Search name/username..." style="min-width: 220px" @update:model-value="onFiltersChanged" />
        <AppSelect v-model="team" :items="teamOptions" item-title="title" item-value="value" style="min-width: 180px" @update:model-value="onFiltersChanged" />
        <AppDateRangePicker :from="dateFrom" :to="dateTo" @update:from="dateFrom = $event" @update:to="dateTo = $event" @change="onFiltersChanged" />
      </div>
    </div>

    <template v-if="team !== 'accounts'">
      <h3 class="section-title">Operations Team</h3>
      <AppDataTable
        class="mb-4"
        :headers="operationsHeaders"
        :items="operationsRows"
        :items-length="operationsRows.length"
        :loading="store.loading"
        item-value="userId"
      >
        <template #item.tripsCompleted="{ item }">{{ formatNumber((item as OpsRow).tripsCompleted) }}</template>
        <template #item.tripsDelayed="{ item }">{{ formatNumber((item as OpsRow).tripsDelayed) }}</template>
        <template #item.revenueGenerated="{ item }">{{ formatCurrency((item as OpsRow).revenueGenerated) }}</template>
        <template #item.onTimeDeliveryRate="{ item }">{{ (item as OpsRow).onTimeDeliveryRate }}%</template>
      </AppDataTable>
    </template>

    <template v-if="team !== 'operations'">
      <h3 class="section-title">Accounts Team</h3>
      <AppDataTable
        :headers="accountsHeaders"
        :items="accountsRows"
        :items-length="accountsRows.length"
        :loading="store.loading"
        item-value="userId"
      >
        <template #item.totalInvoiceValue="{ item }">{{ formatCurrency((item as AcctRow).totalInvoiceValue) }}</template>
        <template #item.totalCollected="{ item }">{{ formatCurrency((item as AcctRow).totalCollected) }}</template>
        <template #item.totalPaidToSuppliers="{ item }">{{ formatCurrency((item as AcctRow).totalPaidToSuppliers) }}</template>
      </AppDataTable>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useTeamPerformanceStore } from '@/stores/performance.store';
import { formatCurrency, formatNumber } from '@/utils/format';
import { AppDataTable, AppSelect, AppTextField, AppDateRangePicker } from '@/components/ui';
import type { PerformanceTeamFilter } from '@/types/performance.types';

interface OpsRow {
  [key: string]: unknown;
  userId: string;
  fullName: string;
  username: string;
  intentsCreated: number;
  tripsCreated: number;
  tripsCompleted: number;
  tripsDelayed: number;
  tripsCancelled: number;
  revenueGenerated: number;
  onTimeDeliveryRate: number;
}

interface AcctRow {
  [key: string]: unknown;
  userId: string;
  fullName: string;
  username: string;
  invoicesGenerated: number;
  totalInvoiceValue: number;
  receiptsCollected: number;
  totalCollected: number;
  supplierPaymentsProcessed: number;
  totalPaidToSuppliers: number;
}

const store = useTeamPerformanceStore();

const search = ref('');
const team = ref<PerformanceTeamFilter>('all');
const dateFrom = ref<string | null>(null);
const dateTo = ref<string | null>(null);

const teamOptions = [
  { title: 'All Teams', value: 'all' },
  { title: 'Operations Team', value: 'operations' },
  { title: 'Accounts Team', value: 'accounts' },
];

const operationsHeaders = [
  { title: 'Name', key: 'fullName' },
  { title: 'Intents Created', key: 'intentsCreated' },
  { title: 'Trips Created', key: 'tripsCreated' },
  { title: 'Completed', key: 'tripsCompleted' },
  { title: 'Delayed', key: 'tripsDelayed' },
  { title: 'Cancelled', key: 'tripsCancelled' },
  { title: 'Revenue', key: 'revenueGenerated' },
  { title: 'On-Time %', key: 'onTimeDeliveryRate' },
];

const accountsHeaders = [
  { title: 'Name', key: 'fullName' },
  { title: 'Invoices Generated', key: 'invoicesGenerated' },
  { title: 'Invoice Value', key: 'totalInvoiceValue' },
  { title: 'Receipts Collected', key: 'receiptsCollected' },
  { title: 'Total Collected', key: 'totalCollected' },
  { title: 'Supplier Payments', key: 'supplierPaymentsProcessed' },
  { title: 'Total Paid', key: 'totalPaidToSuppliers' },
];

const operationsRows = computed<OpsRow[]>(() =>
  store.rows
    .filter((r) => r.operations)
    .map((r) => ({ userId: r.userId, fullName: r.fullName, username: r.username, ...r.operations! }))
);

const accountsRows = computed<AcctRow[]>(() =>
  store.rows
    .filter((r) => r.accounts)
    .map((r) => ({ userId: r.userId, fullName: r.fullName, username: r.username, ...r.accounts! }))
);

function onFiltersChanged() {
  store.fetch({
    team: team.value,
    search: search.value || undefined,
    dateFrom: dateFrom.value || undefined,
    dateTo: dateTo.value || undefined,
    pageSize: 200,
  });
}

onMounted(onFiltersChanged);
</script>

<style scoped>
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 12px;
}
</style>
