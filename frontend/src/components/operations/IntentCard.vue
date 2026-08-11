<template>
  <AppCard class="pa-4" variant="outlined">
    <div class="d-flex justify-space-between align-start mb-2">
      <div>
        <div class="font-weight-medium">{{ intent.intentNumber }}</div>
        <div class="text-caption text-medium-emphasis">{{ intent.company.name }}</div>
      </div>
      <TripStatusChip :status="intent.status" />
    </div>
    <RouteInfoCard :from-label="intent.fromLocation.name" :to-label="intent.toLocation.name" />
    <div class="text-caption text-medium-emphasis mt-2">
      {{ intent.material?.name || 'Material N/A' }} · {{ intent.quantityTon ? `${intent.quantityTon} T` : '' }}
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { AppCard } from '@/components/ui';
import type { Intent } from '@/types/operations.types';
import TripStatusChip from './TripStatusChip.vue';
import RouteInfoCard from './RouteInfoCard.vue';

defineProps<{ intent: Intent }>();
</script>
