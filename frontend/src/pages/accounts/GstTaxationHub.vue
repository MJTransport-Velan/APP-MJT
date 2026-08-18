<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div>
        <h2 class="text-h6 mb-1">GST & Taxation</h2>
        <p class="text-caption text-medium-emphasis mb-0">GST rate configurations for invoicing</p>
      </div>
      <HubSearch v-model="search" placeholder="Search GST & tax pages..." />
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
  { icon: 'mdi-receipt-text-outline', title: 'GST Masters', description: 'GST rate configurations', to: '/accounts/gst-taxation/gst-masters' },
];

const filteredCards = computed(() => {
  if (!search.value.trim()) return cards;
  const q = search.value.trim().toLowerCase();
  return cards.filter((c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
});
</script>
