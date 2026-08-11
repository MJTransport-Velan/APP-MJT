<template>
  <AppTimeline density="compact" side="end" truncate-line="both">
    <AppTimelineItem v-for="(event, index) in events" :key="index" :dot-color="colorFor(event.type)" size="small">
      <div class="d-flex justify-space-between align-center ga-2">
        <div>
          <div class="text-body-2">{{ event.description }}</div>
          <div class="text-caption text-medium-emphasis">{{ new Date(event.date).toLocaleString() }}</div>
        </div>
        <AppChip size="x-small" variant="outlined">{{ event.type }}</AppChip>
      </div>
    </AppTimelineItem>
  </AppTimeline>
  <p v-if="events.length === 0" class="text-caption text-medium-emphasis">No activity recorded yet.</p>
</template>

<script setup lang="ts">
import { AppTimeline, AppTimelineItem, AppChip } from '@/components/ui';
import type { TimelineEvent } from '@/types/fleet.types';

defineProps<{ events: TimelineEvent[] }>();

function colorFor(type: TimelineEvent['type']) {
  switch (type) {
    case 'ASSIGNMENT':
      return 'info';
    case 'FUEL':
      return 'success';
    case 'MAINTENANCE':
      return 'warning';
    case 'EXPENSE':
      return 'error';
    default:
      return 'grey';
  }
}
</script>
