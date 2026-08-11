<template>
  <AppChip :color="color" size="small" variant="flat">{{ label }}</AppChip>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { AppChip } from '@/components/ui';
import type { VehicleStatus } from '@/types/fleet.types';

const props = defineProps<{ status: VehicleStatus }>();

const STATUS_MAP: Record<VehicleStatus, { label: string; color: string }> = {
  AVAILABLE: { label: 'Available', color: 'success' },
  RUNNING: { label: 'Running', color: 'info' },
  UNDER_MAINTENANCE: { label: 'Under Maintenance', color: 'warning' },
  INACTIVE: { label: 'Inactive', color: 'default' },
};

const label = computed(() => STATUS_MAP[props.status]?.label || props.status);
const color = computed(() => STATUS_MAP[props.status]?.color || 'default');
</script>
