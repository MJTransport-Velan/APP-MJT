<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <div>
        <h2 class="text-h6 mb-1">Masters</h2>
        <p class="text-caption text-medium-emphasis mb-0">Manage all reference data used across the system</p>
      </div>
      <HubSearch v-model="search" placeholder="Search masters..." />
    </div>

    <HubSection v-for="category in filteredCategories" :key="category.key" :title="category.title" :icon="category.icon">
      <HubCardGrid :items="category.items" item-key="title">
        <template #default="{ item }">
          <HubCard :icon="(item as any).icon" :title="(item as any).title" :description="(item as any).description" :to="(item as any).to" />
        </template>
      </HubCardGrid>
    </HubSection>

    <p v-if="!filteredCategories.length" class="text-caption text-medium-emphasis">No masters match "{{ search }}"</p>

    <HubFavoritesRecents />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { HubCard, HubCardGrid, HubSection, HubSearch, HubFavoritesRecents } from '@/components/hub';
import { masterCategories } from '@/config/masterCategories';

const search = ref('');

const filteredCategories = computed(() => {
  if (!search.value.trim()) return masterCategories;
  const q = search.value.trim().toLowerCase();
  return masterCategories
    .map((category) => ({
      ...category,
      items: category.items.filter((item) => item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)),
    }))
    .filter((category) => category.items.length > 0);
});
</script>
