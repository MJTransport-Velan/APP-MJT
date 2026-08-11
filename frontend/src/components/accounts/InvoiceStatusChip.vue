<template>
  <AppChip :color="color" size="small" variant="flat">{{ label }}</AppChip>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { AppChip } from '@/components/ui';
import type { InvoiceStatus } from '@/types/accounts.types';

const props = defineProps<{ status: InvoiceStatus }>();

const STATUS_MAP: Record<InvoiceStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'default' },
  GENERATED: { label: 'Generated', color: 'info' },
  SENT: { label: 'Sent', color: 'primary' },
  PARTIALLY_PAID: { label: 'Partially Paid', color: 'warning' },
  PAID: { label: 'Paid', color: 'success' },
  CANCELLED: { label: 'Cancelled', color: 'error' },
};

const label = computed(() => STATUS_MAP[props.status]?.label || props.status);
const color = computed(() => STATUS_MAP[props.status]?.color || 'default');
</script>
