<template>
  <AppCard class="pa-4 text-center" variant="outlined">
    <div class="text-caption text-medium-emphasis">{{ metric }}</div>
    <div class="text-h5 font-weight-bold text-primary">{{ formattedValue }}</div>
  </AppCard>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { AppCard } from '@/components/ui';

const props = defineProps<{ metric: string; value: number | string }>();

const formattedValue = computed(() => {
  const num = typeof props.value === 'number' ? props.value : Number(props.value);
  return Number.isFinite(num) ? num.toLocaleString('en-IN') : String(props.value);
});
</script>
