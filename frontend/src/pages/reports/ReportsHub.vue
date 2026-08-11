<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div>
        <h2 class="text-h6 mb-1">Reports</h2>
        <p class="text-caption text-medium-emphasis mb-0">Operational, fleet, accounts and management reporting</p>
      </div>
      <HubSearch v-model="search" placeholder="Search report categories..." />
    </div>

    <HubCardGrid :items="filteredCards" item-key="title">
      <template #default="{ item }">
        <HubCard v-bind="(item as any)" />
      </template>
    </HubCardGrid>

    <HubFavoritesRecents />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { HubCard, HubCardGrid, HubSearch, HubFavoritesRecents } from '@/components/hub';

const search = ref('');

const cards = [
  { icon: 'mdi-truck-fast-outline', title: 'Operations Reports', description: 'Trip, POD and delivery performance reports', to: '/reports/operations' },
  { icon: 'mdi-truck-outline', title: 'Fleet Reports', description: 'Vehicle utilization, mileage and maintenance reports', to: '/reports/fleet' },
  { icon: 'mdi-bank-outline', title: 'Accounts Reports', description: 'Invoices, receipts, payments and profit reports', to: '/reports/accounts' },
  { icon: 'mdi-briefcase-outline', title: 'Management Reports', description: 'Cross-functional summaries for leadership', to: '/reports/management' },
];

const filteredCards = computed(() => {
  if (!search.value.trim()) return cards;
  const q = search.value.trim().toLowerCase();
  return cards.filter((c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
});
</script>
