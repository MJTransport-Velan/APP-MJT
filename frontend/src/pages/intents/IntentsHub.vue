<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div>
        <h2 class="text-h6 mb-1">Intents</h2>
        <p class="text-caption text-medium-emphasis mb-0">Manage client requests and convert them into trips</p>
      </div>
      <HubSearch v-model="search" placeholder="Search intent pages..." />
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
import { useIntentStore } from '@/stores/operations';
import { HubCard, HubCardGrid, HubSearch, HubStatRow, HubFavoritesRecents } from '@/components/hub';

const store = useIntentStore();
const search = ref('');

onMounted(() => {
  store.fetchStats();
});

const statRow = computed(() => {
  const stats = store.stats as Record<string, number> | undefined;
  return [
    { label: 'Total Intents', value: stats?.total ?? 0, icon: 'mdi-clipboard-text-outline', iconColor: '#4338ca', iconBg: 'rgba(99,102,241,.12)' },
    { label: 'Pending', value: stats?.SUBMITTED ?? 0, icon: 'mdi-clock-outline', iconColor: '#b45309', iconBg: 'rgba(245,158,11,.14)' },
    { label: 'Approved', value: stats?.APPROVED ?? 0, icon: 'mdi-shield-check-outline', iconColor: '#7e22ce', iconBg: 'rgba(168,85,247,.14)' },
    { label: 'Rejected', value: stats?.REJECTED ?? 0, icon: 'mdi-close-circle-outline', iconColor: '#b91c1c', iconBg: 'rgba(239,68,68,.14)' },
  ];
});

const cards = computed(() => [
  {
    icon: 'mdi-plus-box-outline',
    title: 'Create Intent',
    description: 'Log a new client request for transport',
    to: '/intents/create',
    openLabel: 'Create',
  },
  {
    icon: 'mdi-format-list-bulleted',
    title: 'Intent List',
    description: 'View and manage all intents',
    to: '/intents/list',
    stats: [{ label: 'Total', value: (store.stats as any)?.total ?? 0 }],
  },
  {
    icon: 'mdi-clock-outline',
    title: 'Pending Approval',
    description: 'Intents awaiting review and approval',
    to: '/intents/list?status=SUBMITTED',
    stats: [{ label: 'Pending', value: (store.stats as any)?.SUBMITTED ?? 0, color: '#b45309' }],
  },
  {
    icon: 'mdi-shield-check-outline',
    title: 'Approved',
    description: 'Intents ready to be converted into trips',
    to: '/intents/list?status=APPROVED',
    stats: [{ label: 'Approved', value: (store.stats as any)?.APPROVED ?? 0, color: '#7e22ce' }],
  },
  {
    icon: 'mdi-close-circle-outline',
    title: 'Rejected',
    description: 'Intents that did not pass approval',
    to: '/intents/list?status=REJECTED',
    stats: [{ label: 'Rejected', value: (store.stats as any)?.REJECTED ?? 0, color: '#b91c1c' }],
  },
  {
    icon: 'mdi-cancel',
    title: 'Cancelled',
    description: 'Intents withdrawn or cancelled',
    to: '/intents/list?status=CANCELLED',
    stats: [{ label: 'Cancelled', value: (store.stats as any)?.CANCELLED ?? 0, color: '#475569' }],
  },
]);

const filteredCards = computed(() => {
  if (!search.value.trim()) return cards.value;
  const q = search.value.trim().toLowerCase();
  return cards.value.filter((c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
});
</script>
