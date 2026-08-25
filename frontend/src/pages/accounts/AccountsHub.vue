<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div>
        <h2 class="text-h6 mb-1">Accounts</h2>
        <p class="text-caption text-medium-emphasis mb-0">Where money came from, where it is now, and what it's for — no accounting jargon required</p>
      </div>
      <HubSearch v-model="search" placeholder="Search accounts pages..." />
    </div>

    <!-- <HubStatRow :stats="statRow" /> -->

    <HubCardGrid :items="filteredCards" item-key="title">
      <template #default="{ item }">
        <HubCard v-bind="(item as any)" :background-images="ACCOUNTS_CARD_BACKGROUNDS" />
      </template>
    </HubCardGrid>

    <HubFavoritesRecents />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useAccountsDashboardStore } from '@/stores/accounts';
import { HubCard, HubCardGrid, HubSearch, HubStatRow, HubFavoritesRecents } from '@/components/hub';
import { formatCurrency } from '@/utils/format';
import { ACCOUNTS_CARD_BACKGROUNDS } from '@/assets/acc-card-background';

const dashboardStore = useAccountsDashboardStore();
const search = ref('');

onMounted(() => {
  dashboardStore.fetchSummary();
});

const statRow = computed(() => {
  const s = dashboardStore.summary;
  return [
    { label: 'Outstanding Receivables', value: s ? formatCurrency(s.outstandingReceivables) : '-', icon: 'mdi-cash-clock', iconColor: '#b45309', iconBg: 'rgba(245,158,11,.14)' },
    { label: 'Outstanding Payables', value: s ? formatCurrency(s.outstandingPayables) : '-', icon: 'mdi-cash-remove', iconColor: '#b91c1c', iconBg: 'rgba(239,68,68,.14)' },
    { label: 'Revenue (Month)', value: s ? formatCurrency(s.monthlyRevenue) : '-', icon: 'mdi-cash-plus', iconColor: '#15803d', iconBg: 'rgba(34,197,94,.14)' },
    { label: 'Profit (Month)', value: s ? formatCurrency(s.profit) : '-', icon: 'mdi-chart-line', iconColor: '#1e3a8a', iconBg: 'rgba(30,58,138,.1)' },
  ];
});

// Each card is a group landing on its own sub-hub (same drill-down pattern
// as Accounting → Banking) rather than a single flat list of ~40 pages.
const cards = [
  { icon: 'mdi-cash-fast', title: 'Financial Entry', description: 'Record money received, paid, transferred or spent — pick source, destination and purpose, done', to: '/accounts/financial-entry' },
  { icon: 'mdi-wallet-outline', title: 'Capital Account', description: 'Partner contributions and withdrawals, and each partner’s capital balance', to: '/accounts/capital-account' },
  { icon: 'mdi-view-dashboard-variant-outline', title: 'Accounts Dashboard', description: 'Receivables, payables and profit analytics', to: '/accounts/dashboard' },
  { icon: 'mdi-cash-plus', title: 'Receivables', description: 'Customer invoices, receipts, aging, credit control and collections', to: '/accounts/receivables' },
  { icon: 'mdi-cash-minus', title: 'Payables', description: 'Supplier bills and payments for market-vehicle hires', to: '/accounts/payables' },
  { icon: 'mdi-account-cash-outline', title: 'Driver Accounts & Payroll', description: 'Driver advances and settlements; salary structures and payroll runs', to: '/accounts/driver-payroll' },
  { icon: 'mdi-truck-outline', title: 'Assets & FastTag', description: 'The fixed asset register, its categories and dashboard, plus FastTag', to: '/accounts/vehicle-assets' },
  { icon: 'mdi-finance', title: 'Financial Reporting & Closing', description: 'Profitability, outstanding/expense reports, MIS dashboard and audit trail', to: '/accounts/financial-reporting' },
  { icon: 'mdi-bank-outline', title: 'Banking & Cash', description: 'Bank/cash accounts, transfers, cheques and petty cash', to: '/accounting/banking' },
  { icon: 'mdi-domain', title: 'Accounting (Advanced)', description: 'GST & taxation, currencies, cost categories and the organization these books belong to', to: '/accounting' },
];

const filteredCards = computed(() => {
  if (!search.value.trim()) return cards;
  const q = search.value.trim().toLowerCase();
  return cards.filter((c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
});
</script>
