<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div>
        <h2 class="text-h6 mb-1">Finance</h2>
        <p class="text-caption text-medium-emphasis mb-0">Where money came from, where it is now, and what it's for — no accounting jargon required</p>
      </div>
      <HubSearch v-model="search" placeholder="Search finance pages..." />
    </div>

    <!-- <HubStatRow :stats="statRow" /> -->

    <HubCardGrid :items="filteredCards" item-key="title">
      <template #default="{ item }">
        <HubCard v-bind="(item as any)" :background-images="ACCOUNTS_CARD_BACKGROUNDS" />
      </template>
    </HubCardGrid>

    <div class="d-flex flex-wrap align-center ga-2 mt-4">
      <span class="text-caption text-medium-emphasis">Setup:</span>
      <template v-for="(link, i) in setupLinks" :key="link.to">
        <span v-if="i > 0" class="text-caption text-medium-emphasis">·</span>
        <RouterLink :to="link.to" class="text-caption text-primary">{{ link.title }}</RouterLink>
      </template>
    </div>

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

// One card per finance area, in the order an office user actually works
// through them (spec §21). Each lands on its own sub-hub rather than a
// single flat list of ~40 pages.
const cards = [
  { icon: 'mdi-view-dashboard-variant-outline', title: 'Finance Dashboard', description: 'Cash, bank, receivables, payables, loans and profit at a glance', to: '/accounts/dashboard' },
  { icon: 'mdi-cash-fast', title: 'Financial Entries', description: 'Record money received, paid, transferred or spent — pick source, destination and purpose, done', to: '/accounts/financial-entry' },
  { icon: 'mdi-bank-outline', title: 'Loans & EMI', description: 'Vehicle, bank, business and owner loans — EMI schedules, payments and outstanding', to: '/accounts/loans' },
  { icon: 'mdi-wallet-outline', title: 'Capital & Owner Funds', description: 'Owner capital (equity) and owner loans (liability), kept separate — plus withdrawals', to: '/accounts/capital-account' },
  { icon: 'mdi-database-import-outline', title: 'Opening Balance & Migration', description: 'Bring bank, cash, assets, loans, receivables, payables and owner funds across from your previous books', to: '/accounts/opening-balance' },
  { icon: 'mdi-cash-plus', title: 'Receivables', description: 'Customer invoices, receipts, aging, credit control and collections', to: '/accounts/receivables' },
  { icon: 'mdi-cash-minus', title: 'Payables', description: 'Supplier bills and payments for market-vehicle hires', to: '/accounts/payables' },
  { icon: 'mdi-account-cash-outline', title: 'Driver & Employee Accounts', description: 'Driver advances and settlements; salary structures and salary payments', to: '/accounts/driver-payroll' },
  { icon: 'mdi-truck-outline', title: 'Assets', description: 'The fixed asset register, its categories and dashboard', to: '/accounts/vehicle-assets' },
  { icon: 'mdi-credit-card-wireless-outline', title: 'FASTag', description: 'Prepaid FASTag wallet — recharge, toll usage and transaction history', to: '/accounts/fasttag' },
  { icon: 'mdi-bank-outline', title: 'Banking & Cash', description: 'Bank/cash accounts, transfers, cheques and petty cash', to: '/accounting/banking' },
  { icon: 'mdi-finance', title: 'Balance Sheet & Reports', description: 'Balance Sheet, Profit & Loss, profitability, outstanding/expense reports and MIS', to: '/accounts/financial-reporting' },
];

// GST rates, currencies and the organization record are setup data touched a
// few times a year, not daily finance work — so they sit here as quiet links
// rather than taking a card in the grid above (spec §20).
const setupLinks = [
  { title: 'GST & Taxation', to: '/accounts/gst-taxation' },
  { title: 'Currencies', to: '/accounting/currencies' },
  { title: 'Organization', to: '/accounting/organizations' },
];

const filteredCards = computed(() => {
  if (!search.value.trim()) return cards;
  const q = search.value.trim().toLowerCase();
  return cards.filter((c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
});
</script>
