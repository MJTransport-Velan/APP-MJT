<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div>
        <h2 class="text-h6 mb-1">Fleet</h2>
        <p class="text-caption text-medium-emphasis mb-0">Vehicles, drivers, fuel and maintenance in one place</p>
      </div>
      <HubSearch v-model="search" placeholder="Search fleet pages..." />
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
import { useFleetDashboardStore } from '@/stores/fleet';
import { HubCard, HubCardGrid, HubSearch, HubStatRow, HubFavoritesRecents } from '@/components/hub';
import { formatNumber } from '@/utils/format';

const dashboardStore = useFleetDashboardStore();
const search = ref('');

onMounted(() => {
  dashboardStore.fetchSummary();
});

const statRow = computed(() => {
  const s = dashboardStore.summary;
  return [
    { label: 'Total Vehicles', value: s ? formatNumber(s.fleetSummary.totalVehicles) : '-', icon: 'mdi-truck-outline', iconColor: '#1e3a8a', iconBg: 'rgba(30,58,138,.1)' },
    { label: 'Available', value: s ? formatNumber(s.statusSummary.available) : '-', icon: 'mdi-check-circle-outline', iconColor: '#15803d', iconBg: 'rgba(34,197,94,.14)' },
    { label: 'On Trip', value: s ? formatNumber(s.statusSummary.running) : '-', icon: 'mdi-map-marker-path', iconColor: '#0ea5e9', iconBg: 'rgba(14,165,233,.14)' },
    { label: 'Under Maintenance', value: s ? formatNumber(s.statusSummary.underMaintenance) : '-', icon: 'mdi-wrench-outline', iconColor: '#b45309', iconBg: 'rgba(245,158,11,.14)' },
  ];
});

const cards = [
  { icon: 'mdi-truck-outline', title: 'Vehicles', description: 'Manage company vehicles, documents and status', to: '/fleet/vehicles' },
  { icon: 'mdi-account-switch-outline', title: 'Vehicle Assignments', description: 'Assign vehicles to drivers and manage allocations', to: '/fleet/assignments' },
  { icon: 'mdi-gas-station-outline', title: 'Diesel / Fuel', description: 'Record fuel purchases, track mileage and fuel cost per km', to: '/fleet/fuel' },
  { icon: 'mdi-credit-card-wireless-outline', title: 'FASTag', description: 'Toll transactions, wallet recharge and reconciliation', to: '/accounts/fasttag' },
  { icon: 'mdi-wrench-outline', title: 'Maintenance', description: 'Schedule and track vehicle maintenance and services', to: '/fleet/maintenance' },
  { icon: 'mdi-cog-outline', title: 'Spare Parts Usage', description: 'Track spare parts inventory and consumption', to: '/fleet/spare-parts-usage' },
  { icon: 'mdi-cash-multiple', title: 'Vehicle Expenses', description: 'Track all vehicle-related expenses and payments', to: '/fleet/expenses' },
  { icon: 'mdi-account-tie-outline', title: 'Supplier Vehicles', description: 'Manage outsourced vehicles and supplier details', to: '/fleet/supplier-vehicles' },
  { icon: 'mdi-view-dashboard-variant-outline', title: 'Fleet Analytics', description: 'Utilization, efficiency and expense analytics', to: '/fleet/dashboard' },
];

const filteredCards = computed(() => {
  if (!search.value.trim()) return cards;
  const q = search.value.trim().toLowerCase();
  return cards.filter((c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
});
</script>
