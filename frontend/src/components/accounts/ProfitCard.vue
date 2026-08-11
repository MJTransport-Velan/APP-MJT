<template>
  <AppCard class="pa-4">
    <div class="d-flex align-center ga-3">
      <AppAvatar :color="color" size="44" rounded="lg">
        <AppIcon :icon="icon" color="white" />
      </AppAvatar>
      <div>
        <div class="text-caption text-medium-emphasis">{{ label }}</div>
        <div class="text-h6 font-weight-bold" :class="valueClass">{{ formattedValue }}</div>
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { formatCurrency } from '@/utils/format';
import { AppCard, AppAvatar, AppIcon } from '@/components/ui';

const props = withDefaults(
  defineProps<{
    label: string;
    value: number;
    icon?: string;
    color?: string;
    colorByValue?: boolean;
  }>(),
  {
    icon: 'mdi-cash-multiple',
    color: 'primary',
    colorByValue: false,
  }
);

const formattedValue = computed(() => formatCurrency(props.value));
const valueClass = computed(() => {
  if (!props.colorByValue) return '';
  return props.value >= 0 ? 'text-success' : 'text-error';
});
</script>
