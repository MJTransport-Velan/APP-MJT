<template>
  <AppCard class="pa-4">
    <h3 class="text-subtitle-1 font-weight-medium mb-2">{{ title }}</h3>
    <apexchart :type="type" :height="height" :options="options" :series="series" />
  </AppCard>
</template>

<script setup lang="ts">
import { AppCard } from '@/components/ui';

withDefaults(
  defineProps<{
    title: string;
    type: 'bar' | 'line' | 'donut' | 'area';
    options: Record<string, unknown>;
    series: unknown;
    height?: number;
  }>(),
  { height: 280 }
);
</script>
