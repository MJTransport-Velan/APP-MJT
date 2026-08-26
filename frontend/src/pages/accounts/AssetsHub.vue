<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div>
        <h2 class="text-h6 mb-1">Assets</h2>
        <p class="text-caption text-medium-emphasis mb-0">
          What the business owns — the fixed asset register, its categories and dashboard
        </p>
      </div>
      <HubSearch v-model="search" placeholder="Search asset pages..." />
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
import { computed, ref } from "vue";
import { HubCard, HubCardGrid, HubSearch, HubFavoritesRecents } from "@/components/hub";
import { ACCOUNTS_CARD_BACKGROUNDS } from "@/assets/acc-card-background";

const search = ref("");

const cards = [
  {
    icon: "mdi-shape-outline",
    title: "Asset Categories",
    description: "Asset type, useful life and residual % per asset category",
    to: "/accounts/asset-categories",
  },
  {
    icon: "mdi-truck-outline",
    title: "Asset Register",
    description:
      "Add, edit and delete vehicles and other fixed assets, with purchase approval",
    to: "/accounts/assets",
  },
  {
    icon: "mdi-view-dashboard-variant-outline",
    title: "Asset Dashboard",
    description: "Asset count, fleet value, value by category and top expense vehicles",
    to: "/accounts/asset-dashboard",
  },
  // FASTag is its own Finance module now (spec §14) — it is a prepaid
  // wallet, not something the asset register should account for.
];

const filteredCards = computed(() => {
  if (!search.value.trim()) return cards;
  const q = search.value.trim().toLowerCase();
  return cards.filter(
    (c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
  );
});
</script>
