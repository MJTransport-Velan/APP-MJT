<template>
  <nav class="app-breadcrumbs">
    <template v-for="(item, index) in items" :key="index">
      <RouterLink v-if="item.to && !item.disabled" :to="item.to" class="app-breadcrumbs__item">{{ item.title }}</RouterLink>
      <span v-else class="app-breadcrumbs__item app-breadcrumbs__item--disabled">{{ item.title }}</span>
      <AppIcon v-if="index < items.length - 1" icon="mdi-chevron-right" size="small" class="app-breadcrumbs__sep" />
    </template>
  </nav>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
import AppIcon from './AppIcon.vue';

defineProps<{ items: Array<{ title: string; to?: string; disabled?: boolean }> }>();
</script>

<style scoped>
.app-breadcrumbs { display: flex; align-items: center; gap: 4px; font-size: 0.8125rem; }
.app-breadcrumbs__item { color: var(--color-text-medium); text-decoration: none; }
.app-breadcrumbs__item:not(.app-breadcrumbs__item--disabled):hover { color: var(--color-primary); }
.app-breadcrumbs__item--disabled { color: var(--color-text); font-weight: 500; }
.app-breadcrumbs__sep { color: var(--color-text-disabled); }
</style>
