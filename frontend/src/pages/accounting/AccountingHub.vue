<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div>
        <h2 class="text-h6 mb-1">Accounting</h2>
        <p class="text-caption text-medium-emphasis mb-0">
          Banking, cash and the organization these books belong to
        </p>
      </div>
      <HubSearch v-model="search" placeholder="Search accounting pages..." />
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
  { icon: 'mdi-bank-outline', title: 'Banking & Cash', description: 'Bank/cash accounts, transfers, cheques and petty cash', to: '/accounting/banking' },
  { icon: 'mdi-currency-inr', title: 'Currencies', description: 'Base currency and forex reference data', to: '/accounting/currencies' },
  { icon: 'mdi-shape-outline', title: 'Cost Categories', description: 'Grouping of cost centers by type', to: '/accounting/cost-categories' },
  { icon: 'mdi-domain', title: 'Organization', description: 'The legal entity these books belong to', to: '/accounting/organizations' },
];

const filteredCards = computed(() => {
  if (!search.value.trim()) return cards;
  const q = search.value.trim().toLowerCase();
  return cards.filter((c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
});
</script>
