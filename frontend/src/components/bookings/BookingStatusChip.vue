<template>
  <AppChip :color="color" size="small" variant="flat">{{ label }}</AppChip>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { AppChip } from '@/components/ui';
import type { BookingStatus } from '@/types/bookings.types';

const props = defineProps<{ status: BookingStatus }>();

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'warning' },
  CONFIRMED: { label: 'Confirmed', color: 'success' },
  REJECTED: { label: 'Rejected', color: 'error' },
  VEHICLE_ASSIGNED: { label: 'Vehicle Assigned', color: 'info' },
  LR_GENERATED: { label: 'LR Generated', color: 'secondary' },
  PICKED_UP: { label: 'Picked Up', color: 'primary' },
  IN_TRANSIT: { label: 'In Transit', color: 'primary' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'primary' },
  DELIVERED: { label: 'Delivered', color: 'success' },
};

const label = computed(() => STATUS_MAP[props.status]?.label || props.status);
const color = computed(() => STATUS_MAP[props.status]?.color || 'default');
</script>
