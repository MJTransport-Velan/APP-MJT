<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div>
        <h2 class="text-h6 mb-1">Trips</h2>
        <p class="text-caption text-medium-emphasis mb-0">Plan, assign and track trips for approved intents</p>
      </div>
      <HubSearch v-model="search" placeholder="Search trip pages..." />
    </div>

    <!-- <HubStatRow :stats="statRow" /> -->

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
import { useTripStore } from '@/stores/operations';
import { HubCard, HubCardGrid, HubSearch, HubStatRow, HubFavoritesRecents } from '@/components/hub';

const store = useTripStore();
const search = ref('');

onMounted(() => {
  store.fetchStats();
});

function groupTotal(keys: string[]) {
  const stats = store.stats as Record<string, number> | undefined;
  return keys.reduce((sum, k) => sum + (stats?.[k] ?? 0), 0);
}

const statRow = computed(() => [
  { label: 'Total Trips', value: (store.stats as any)?.total ?? 0, icon: 'mdi-clipboard-text-outline', iconColor: '#4338ca', iconBg: 'rgba(99,102,241,.12)' },
  {
    label: 'Unassigned',
    value: groupTotal(['DRAFT', 'PLANNED', 'APPROVED']),
    icon: 'mdi-truck-alert-outline',
    iconColor: '#475569',
    iconBg: 'rgba(100,116,139,.12)',
  },
  {
    label: 'In Transit',
    value: groupTotal(['STARTED', 'LOADING', 'IN_TRANSIT', 'REACHED_DESTINATION', 'UNLOADING']),
    icon: 'mdi-truck-fast-outline',
    iconColor: '#b45309',
    iconBg: 'rgba(245,158,11,.14)',
  },
  { label: 'Completed', value: groupTotal(['COMPLETED']), icon: 'mdi-flag-checkered', iconColor: '#15803d', iconBg: 'rgba(34,197,94,.14)' },
  { label: 'Cancelled', value: groupTotal(['CANCELLED']), icon: 'mdi-cancel', iconColor: '#b91c1c', iconBg: 'rgba(239,68,68,.14)' },
]);

const cards = computed(() => [
  {
    icon: 'mdi-truck-alert-outline',
    title: 'Unassigned Trips',
    description: 'Trips created from approved intents, awaiting vehicle & driver assignment',
    to: '/trips/list?statusGroup=Unassigned',
    stats: [{ label: 'Unassigned', value: groupTotal(['DRAFT', 'PLANNED', 'APPROVED']), color: '#475569' }],
  },
  {
    icon: 'mdi-format-list-bulleted',
    title: 'Trip List',
    description: 'View and manage all trips',
    to: '/trips/list',
    stats: [{ label: 'Total', value: (store.stats as any)?.total ?? 0 }],
  },
  {
    icon: 'mdi-truck-fast-outline',
    title: 'In Transit',
    description: 'Trips currently on the road',
    to: '/trips/list?statusGroup=In Transit',
    stats: [{ label: 'In Transit', value: groupTotal(['STARTED', 'LOADING', 'IN_TRANSIT', 'REACHED_DESTINATION', 'UNLOADING']), color: '#b45309' }],
  },
  {
    icon: 'mdi-flag-checkered',
    title: 'Completed Trips',
    description: 'Trips that have finished delivery',
    to: '/trips/list?statusGroup=Completed',
    stats: [{ label: 'Completed', value: groupTotal(['COMPLETED']), color: '#15803d' }],
  },
  {
    icon: 'mdi-cancel',
    title: 'Cancelled Trips',
    description: 'Trips that were cancelled',
    to: '/trips/list?statusGroup=Cancelled',
    stats: [{ label: 'Cancelled', value: groupTotal(['CANCELLED']), color: '#b91c1c' }],
  },
  {
    icon: 'mdi-cash-multiple',
    title: 'Trip Expenses',
    description: 'Record and review trip-related expenses',
    to: '/operations/expenses',
  },
  {
    icon: 'mdi-file-check-outline',
    title: 'POD Management',
    description: 'Upload and verify proof of delivery',
    to: '/operations/pod',
  },
]);

const filteredCards = computed(() => {
  if (!search.value.trim()) return cards.value;
  const q = search.value.trim().toLowerCase();
  return cards.value.filter((c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
});
</script>
