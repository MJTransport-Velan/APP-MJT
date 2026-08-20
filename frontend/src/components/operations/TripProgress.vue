<template>
  <div class="trip-progress">
    <template v-for="(step, index) in steps" :key="step">
      <div class="trip-progress__step">
        <span
          class="trip-progress__circle"
          :class="{
            'trip-progress__circle--complete': index <= currentIndex,
            'trip-progress__circle--active': index === currentIndex + 1,
          }"
        >
          <AppIcon v-if="index <= currentIndex" icon="mdi-check" size="small" />
          <template v-else>{{ index + 1 }}</template>
        </span>
        <span class="trip-progress__label">{{ stepLabel(step) }}</span>
      </div>
      <div
        v-if="index < steps.length - 1"
        class="trip-progress__connector"
        :class="{ 'trip-progress__connector--complete': index < currentIndex }"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppIcon from '@/components/ui/AppIcon.vue';
import type { TripStatus } from '@/types/operations.types';

const props = defineProps<{ status: TripStatus }>();

const steps: TripStatus[] = [
  'ASSIGNED', 'STARTED', 'LOADING', 'IN_TRANSIT', 'REACHED_DESTINATION', 'UNLOADING', 'COMPLETED',
];

const LABELS: Record<string, string> = {
  ASSIGNED: 'Assigned',
  STARTED: 'Started',
  LOADING: 'Loading',
  IN_TRANSIT: 'In Transit',
  REACHED_DESTINATION: 'Reached Destination',
  UNLOADING: 'Unloading',
  COMPLETED: 'Completed',
};

function stepLabel(step: string) {
  return LABELS[step] || step;
}

// Index of the step matching the trip's current status; that step and
// everything before it are complete. -1 (status not in this flow yet,
// e.g. APPROVED) means nothing is complete and the first step is "up next".
const currentIndex = computed(() => steps.indexOf(props.status));
</script>

<style scoped>
.trip-progress {
  display: flex;
  align-items: flex-start;
  overflow-x: auto;
  padding-bottom: 4px;
  -webkit-mask-image: linear-gradient(to right, transparent, #000 12px, #000 calc(100% - 12px), transparent);
  mask-image: linear-gradient(to right, transparent, #000 12px, #000 calc(100% - 12px), transparent);
}
.trip-progress__step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  width: 96px;
}
.trip-progress__circle {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-divider);
  color: var(--color-text-medium);
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}
.trip-progress__circle--complete {
  background: var(--color-success);
  color: #fff;
}
.trip-progress__circle--active {
  background: var(--color-primary);
  color: #fff;
}
.trip-progress__label {
  font-size: 0.75rem;
  white-space: nowrap;
  color: var(--color-text-medium);
  text-align: center;
}
.trip-progress__connector {
  flex: 1 1 auto;
  height: 2px;
  min-width: 16px;
  background: var(--color-divider);
  margin-top: 15px;
}
.trip-progress__connector--complete {
  background: var(--color-success);
}
</style>
