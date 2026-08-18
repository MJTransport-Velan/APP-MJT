<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div>
        <h2 class="text-h6 mb-1">Receivables</h2>
        <p class="text-caption text-medium-emphasis mb-0">Customer invoices, receipts, aging, credit control and collections</p>
      </div>
      <HubSearch v-model="search" placeholder="Search receivables pages..." />
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
  { icon: 'mdi-receipt-text-outline', title: 'Customer Invoices & Receipts', description: 'Generate invoices and record receipts, and track outstanding & aging — every invoice becomes a Voucher', to: '/accounts/invoices' },
  { icon: 'mdi-shield-check-outline', title: 'Credit Control', description: 'Customer credit limits, terms and blocks', to: '/accounts/credit-control' },
  { icon: 'mdi-phone-outline', title: 'Collections', description: 'Follow-ups, reminders and promise-to-pay tracking', to: '/accounts/collections' },
];

const filteredCards = computed(() => {
  if (!search.value.trim()) return cards;
  const q = search.value.trim().toLowerCase();
  return cards.filter((c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
});
</script>
