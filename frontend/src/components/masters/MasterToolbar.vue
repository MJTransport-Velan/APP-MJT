<template>
  <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
    <h2 class="text-h6">{{ title }}</h2>
    <AppBtn v-if="canCreate" color="primary" prepend-icon="mdi-plus" @click="$emit('create')">
      {{ createLabel }}
    </AppBtn>
  </div>
</template>

<script setup lang="ts">
import { AppBtn } from '@/components/ui';

withDefaults(
  defineProps<{
    title: string;
    canCreate?: boolean;
    createLabel?: string;
  }>(),
  {
    canCreate: true,
    createLabel: 'New',
  }
);

defineEmits<{ create: [] }>();
</script>
