<template>
  <div class="row row-dense">
    <div v-for="card in cards" :key="card.label" class="col-6 col-sm-3">
      <AppCard class="pa-3 text-center" variant="outlined">
        <div class="text-caption text-medium-emphasis">{{ card.label }}</div>
        <div class="text-subtitle-1 font-weight-bold">{{ formatCurrency(card.value) }}</div>
      </AppCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatCurrency } from '@/utils/format';
import { AppCard } from '@/components/ui';

defineProps<{ cards: { label: string; value: number }[] }>();
</script>
