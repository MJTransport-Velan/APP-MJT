<template>
  <AppCard class="pa-4" :class="{ 'profit-card--clickable': clickable }" @click="clickable && emit('click')">
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
    clickable?: boolean;
  }>(),
  {
    icon: 'mdi-cash-multiple',
    color: 'primary',
    colorByValue: false,
    clickable: false,
  }
);

const emit = defineEmits<{ click: [] }>();

const formattedValue = computed(() => formatCurrency(props.value));
const valueClass = computed(() => {
  if (!props.colorByValue) return '';
  return props.value >= 0 ? 'text-success' : 'text-error';
});
</script>

<style scoped>
.profit-card--clickable {
  cursor: pointer;
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}
.profit-card--clickable:hover {
  box-shadow: var(--elevation-2, 0 4px 12px rgba(0, 0, 0, 0.12));
  transform: translateY(-1px);
}
</style>
