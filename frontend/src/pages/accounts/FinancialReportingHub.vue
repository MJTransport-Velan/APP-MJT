<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div>
        <h2 class="text-h6 mb-1">Financial Reporting & Closing</h2>
        <p class="text-caption text-medium-emphasis mb-0">Trip P&L, profitability, operational reports, MIS dashboard and audit trail</p>
      </div>
      <HubSearch v-model="search" placeholder="Search reporting pages..." />
    </div>

    <HubCardGrid :items="filteredCards" item-key="title">
      <template #default="{ item }">
        <HubCard v-bind="(item as any)" :background-images="ACCOUNTS_CARD_BACKGROUNDS" />
      </template>
    </HubCardGrid>

    <HubFavoritesRecents />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { HubCard, HubCardGrid, HubSearch, HubFavoritesRecents } from '@/components/hub';
import { ACCOUNTS_CARD_BACKGROUNDS } from '@/assets/acc-card-background';

const search = ref('');

const cards = [
  { icon: 'mdi-chart-line', title: 'Trip Financials', description: 'Vehicle, supplier and customer profit reports', to: '/accounts/trip-financials' },
  { icon: 'mdi-chart-areaspline', title: 'Profitability Reports', description: 'Customer, Supplier, Vehicle, Driver and Route profitability', to: '/accounts/profitability-reports' },
  { icon: 'mdi-scale-balance', title: 'Outstanding, Loan & Expense Reports', description: 'Driver/Employee outstanding, Vehicle Loan Report and Expense Analysis', to: '/accounts/operational-reports' },
  { icon: 'mdi-view-dashboard-outline', title: 'MIS Dashboard', description: 'Outstanding, vehicle/driver cost and top customers/suppliers at a glance', to: '/accounts/mis-dashboard' },
  { icon: 'mdi-book-open-page-variant-outline', title: 'Balance Sheet', description: 'What MJ Transport owns and owes, and its net financial position, as of any date', to: '/accounts/balance-sheet' },
  { icon: 'mdi-chart-bell-curve-cumulative', title: 'Profit & Loss', description: 'Income vs Expenses and Net Profit for a selected period', to: '/accounts/profit-loss' },
  { icon: 'mdi-shield-search', title: 'Audit Reports', description: 'User activity audit trail', to: '/accounts/audit-reports' },
  { icon: 'mdi-calendar-clock', title: 'Report Schedules', description: 'Define recurring report schedules (foundation — execution is a future phase)', to: '/accounts/report-schedules' },
];

const filteredCards = computed(() => {
  if (!search.value.trim()) return cards;
  const q = search.value.trim().toLowerCase();
  return cards.filter((c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
});
</script>
