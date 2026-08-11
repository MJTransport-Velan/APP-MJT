<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div>
        <h2 class="text-h6 mb-1">Operations</h2>
        <p class="text-caption text-medium-emphasis mb-0">Trip execution, POD, expenses and fleet management</p>
      </div>
      <HubSearch v-model="search" placeholder="Search operations pages..." />
    </div>

    <HubStatRow :stats="statRow" />

    <HubCardGrid :items="filteredCards" item-key="title">
      <template #default="{ item }">
        <HubCard v-bind="(item as any)" />
      </template>
    </HubCardGrid>

    <HubFavoritesRecents />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useOperationsDashboardStore } from '@/stores/operations';
import { HubCard, HubCardGrid, HubSearch, HubStatRow, HubFavoritesRecents } from '@/components/hub';
import { formatNumber } from '@/utils/format';

const dashboardStore = useOperationsDashboardStore();
const search = ref('');

onMounted(() => {
  dashboardStore.fetchSummary();
});

const statRow = computed(() => {
  const s = dashboardStore.summary;
  return [
    { label: 'Pending Intents', value: s ? formatNumber(s.intentSummary.pending) : '-', icon: 'mdi-file-clock-outline', iconColor: '#b45309', iconBg: 'rgba(245,158,11,.14)' },
    { label: 'Trips Running', value: s ? formatNumber(s.tripSummary.running) : '-', icon: 'mdi-truck-fast-outline', iconColor: '#0ea5e9', iconBg: 'rgba(14,165,233,.14)' },
    { label: 'Trips Completed', value: s ? formatNumber(s.tripSummary.completed) : '-', icon: 'mdi-check-circle-outline', iconColor: '#15803d', iconBg: 'rgba(34,197,94,.14)' },
    { label: 'Delayed Trips', value: s ? formatNumber(s.tripSummary.delayed) : '-', icon: 'mdi-clock-alert-outline', iconColor: '#b91c1c', iconBg: 'rgba(239,68,68,.14)' },
  ];
});

// 'Fleet' drills down into its own sub-hub (same pattern as Accounts's
// 'Accounting (Advanced)' card) rather than flattening all 8 fleet pages in
// here — Fleet merged into Operations at the sidebar/nav level only.
const cards = [
  { icon: 'mdi-file-check-outline', title: 'POD Management', description: 'Upload and verify proof of delivery documents', to: '/operations/pod' },
  { icon: 'mdi-cash-multiple', title: 'Trip Expenses', description: 'Record and review trip-related expenses', to: '/operations/expenses' },
  { icon: 'mdi-view-dashboard-variant-outline', title: 'Operations Analytics', description: 'Intent, trip and revenue analytics', to: '/operations/dashboard' },
  { icon: 'mdi-truck-fast-outline', title: 'Fleet', description: 'Vehicles, drivers, fuel, maintenance and spare parts', to: '/fleet' },
];

const filteredCards = computed(() => {
  if (!search.value.trim()) return cards;
  const q = search.value.trim().toLowerCase();
  return cards.filter((c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
});
</script>
