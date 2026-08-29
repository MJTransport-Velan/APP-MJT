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

// Fleet has no independent workflow of its own — every fleet page exists to
// support trip execution — so its pages are flattened directly into this
// grid rather than drilling into a separate Fleet sub-hub. They live at
// /operations/... too: a /fleet/... URL named a module the sidebar never
// shows. The old URLs still redirect here.
const cards = [
  { icon: 'mdi-file-check-outline', title: 'POD Management', description: 'Upload and verify proof of delivery documents', to: '/operations/pod' },
  { icon: 'mdi-cash-multiple', title: 'Trip Expenses', description: 'Record and review trip-related expenses', to: '/operations/expenses' },
  { icon: 'mdi-view-dashboard-variant-outline', title: 'Operations Analytics', description: 'Intent, trip and revenue analytics', to: '/operations/dashboard' },
  { icon: 'mdi-truck-outline', title: 'Vehicles', description: 'Manage company vehicles, documents and status', to: '/operations/vehicles' },
  { icon: 'mdi-account-switch-outline', title: 'Vehicle Assignments', description: 'Assign vehicles to drivers and manage allocations', to: '/operations/assignments' },
  { icon: 'mdi-gas-station-outline', title: 'Diesel / Fuel', description: 'Fuel purchases, mileage and cost per km, plus the shared prepaid card account every fuel card spends from', to: '/operations/fuel' },
  { icon: 'mdi-water-outline', title: 'AdBlue', description: 'AdBlue top-ups per truck — drawn from the yard stock or bought on the road — and the shared store they draw from', to: '/operations/adblue' },
  { icon: 'mdi-credit-card-wireless-outline', title: 'FASTag', description: 'Toll transactions, wallet recharge and reconciliation', to: '/operations/fasttag' },
  { icon: 'mdi-wrench-outline', title: 'Maintenance', description: 'Schedule and track vehicle maintenance and services', to: '/operations/maintenance' },
  { icon: 'mdi-cog-outline', title: 'Spare Parts Usage', description: 'Track spare parts inventory and consumption', to: '/operations/spare-parts-usage' },
  { icon: 'mdi-cash-multiple', title: 'Vehicle Expenses', description: 'Track all vehicle-related expenses and payments', to: '/operations/vehicle-expenses' },
  { icon: 'mdi-view-dashboard-variant-outline', title: 'Fleet Analytics', description: 'Utilization, efficiency and expense analytics', to: '/operations/fleet-dashboard' },
];

const filteredCards = computed(() => {
  if (!search.value.trim()) return cards;
  const q = search.value.trim().toLowerCase();
  return cards.filter((c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
});
</script>
