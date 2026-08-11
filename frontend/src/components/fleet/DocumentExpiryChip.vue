<template>
  <AppChip v-if="date" :color="color" size="small" variant="tonal">
    {{ formattedDate }}
    <span v-if="daysLeft !== null" class="ml-1">({{ daysLabel }})</span>
  </AppChip>
  <span v-else class="text-caption text-medium-emphasis">Not set</span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { AppChip } from '@/components/ui';

const props = defineProps<{ date: string | null }>();

const daysLeft = computed(() => {
  if (!props.date) return null;
  const diff = new Date(props.date).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

const formattedDate = computed(() => (props.date ? new Date(props.date).toLocaleDateString() : ''));

const color = computed(() => {
  if (daysLeft.value === null) return 'default';
  if (daysLeft.value < 0) return 'error';
  if (daysLeft.value <= 30) return 'warning';
  return 'success';
});

const daysLabel = computed(() => {
  if (daysLeft.value === null) return '';
  return daysLeft.value < 0 ? 'Expired' : `${daysLeft.value}d left`;
});
</script>
