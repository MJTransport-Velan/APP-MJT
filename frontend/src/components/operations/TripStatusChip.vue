<template>
  <AppChip :color="color" size="small" variant="flat">{{ label }}</AppChip>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { AppChip } from '@/components/ui';
import type { TripStatus, IntentStatus } from '@/types/operations.types';

const props = defineProps<{ status: TripStatus | IntentStatus }>();

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'default' },
  SUBMITTED: { label: 'Pending', color: 'warning' },
  PLANNED: { label: 'Planned', color: 'info' },
  APPROVED: { label: 'Approved', color: 'success' },
  CONVERTED: { label: 'Converted', color: 'secondary' },
  ASSIGNED: { label: 'Assigned', color: 'info' },
  STARTED: { label: 'Started', color: 'primary' },
  LOADING: { label: 'Loading', color: 'primary' },
  IN_TRANSIT: { label: 'In Transit', color: 'primary' },
  REACHED_DESTINATION: { label: 'Reached Destination', color: 'secondary' },
  UNLOADING: { label: 'Unloading', color: 'secondary' },
  COMPLETED: { label: 'Completed', color: 'success' },
  REJECTED: { label: 'Rejected', color: 'error' },
  CANCELLED: { label: 'Cancelled', color: 'error' },
};

const label = computed(() => STATUS_MAP[props.status]?.label || props.status);
const color = computed(() => STATUS_MAP[props.status]?.color || 'default');
</script>
