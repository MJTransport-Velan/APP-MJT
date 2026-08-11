<template>
  <AppCard class="pa-4">
    <div class="d-flex align-center ga-3">
      <AppAvatar :color="color" size="44" rounded="lg">
        <AppIcon :icon="icon" color="white" />
      </AppAvatar>
      <div>
        <div class="text-caption text-medium-emphasis">{{ label }}</div>
        <div class="text-h6 font-weight-bold">{{ value }}</div>
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { AppCard, AppAvatar, AppIcon } from '@/components/ui';

withDefaults(
  defineProps<{
    label: string;
    value: string | number;
    icon?: string;
    color?: string;
  }>(),
  {
    icon: 'mdi-gas-station-outline',
    color: 'info',
  }
);
</script>
