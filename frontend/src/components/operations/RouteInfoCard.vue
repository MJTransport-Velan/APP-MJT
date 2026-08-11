<template>
  <div class="d-flex align-center ga-2">
    <AppIcon icon="mdi-map-marker-outline" color="primary" size="18" />
    <span class="text-body-2 font-weight-bold">{{ fromLabel }}</span>
    <AppIcon icon="mdi-arrow-right" size="16" class="text-medium-emphasis" />
    <AppIcon icon="mdi-map-marker-check-outline" color="success" size="18" />
    <span class="text-body-2 font-weight-bold">{{ toLabel }}</span>
  </div>
</template>

<script setup lang="ts">
import { AppIcon } from '@/components/ui';
defineProps<{ fromLabel: string; toLabel: string }>();
</script>
