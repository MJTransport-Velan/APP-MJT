<template>
  <AppTimeline density="compact" side="end" truncate-line="both">
    <AppTimelineItem v-for="record in records" :key="record.id" :dot-color="typeColor(record.type)" size="small">
      <div class="d-flex justify-space-between align-start ga-2">
        <div>
          <div class="text-body-2 font-weight-medium">{{ record.type }} — {{ record.description }}</div>
          <div class="text-caption text-medium-emphasis">
            {{ new Date(record.serviceDate).toLocaleDateString() }}
            <span v-if="record.cost"> · {{ formatCurrency(record.cost) }}</span>
          </div>
        </div>
        <AppChip size="x-small" :color="record.status === 'COMPLETED' ? 'success' : 'warning'" variant="flat">
          {{ record.status }}
        </AppChip>
      </div>
    </AppTimelineItem>
  </AppTimeline>
  <p v-if="records.length === 0" class="text-caption text-medium-emphasis">No maintenance records yet.</p>
</template>

<script setup lang="ts">
import { AppTimeline, AppTimelineItem, AppChip } from '@/components/ui';
import type { MaintenanceRecord } from '@/types/fleet.types';
import { formatCurrency } from '@/utils/format';

defineProps<{ records: MaintenanceRecord[] }>();

function typeColor(type: MaintenanceRecord['type']) {
  switch (type) {
    case 'SERVICE':
      return 'info';
    case 'REPAIR':
      return 'warning';
    case 'BREAKDOWN':
    case 'ACCIDENT':
      return 'error';
    default:
      return 'grey';
  }
}
</script>
