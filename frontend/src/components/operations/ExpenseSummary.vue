<template>
  <div>
    <div class="row">
      <div v-for="card in cards" :key="card.label" class="col-6 col-sm-4 col-md-2">
        <AppCard class="pa-3 text-center" variant="outlined">
          <div class="text-caption text-medium-emphasis">{{ card.label }}</div>
          <div class="text-subtitle-1 font-weight-bold">{{ formatCurrency(card.value) }}</div>
        </AppCard>
      </div>
    </div>
    <p v-if="hasLinkedRows" class="text-caption text-medium-emphasis mt-2 mb-0">
      Rows marked "Auto" below are already recorded via Diesel/Fuel or FASTag for this trip — no need to log them again here.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { AppCard } from '@/components/ui';
import type { TripExpense } from '@/types/operations.types';
import { formatCurrency } from '@/utils/format';

const props = defineProps<{ expenses: TripExpense[] }>();

const CATEGORIES = ['FUEL', 'DRIVER_BATA', 'TOLL', 'LOADING', 'UNLOADING', 'MISCELLANEOUS'];
const LABELS: Record<string, string> = {
  FUEL: 'Fuel',
  DRIVER_BATA: 'Driver Bata',
  TOLL: 'Toll',
  LOADING: 'Loading',
  UNLOADING: 'Unloading',
  MISCELLANEOUS: 'Misc',
};

const hasLinkedRows = computed(() => props.expenses.some((e) => e.source === 'linked'));

const cards = computed(() =>
  CATEGORIES.map((cat) => ({
    label: LABELS[cat],
    value: props.expenses.filter((e) => e.category === cat).reduce((sum, e) => sum + Number(e.amount), 0),
  }))
);
</script>
