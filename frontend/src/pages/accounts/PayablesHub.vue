<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div>
        <h2 class="text-h6 mb-1">Payables</h2>
        <p class="text-caption text-medium-emphasis mb-0">Supplier bills and payments for market-vehicle hires</p>
      </div>
      <HubSearch v-model="search" placeholder="Search payables pages..." />
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
  { icon: 'mdi-file-document-outline', title: 'Supplier Bills & Payments', description: 'Bills and payments to market-vehicle suppliers, incl. retention release — every bill becomes a Purchase Voucher', to: '/accounts/supplier-bills' },
];

const filteredCards = computed(() => {
  if (!search.value.trim()) return cards;
  const q = search.value.trim().toLowerCase();
  return cards.filter((c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
});
</script>
