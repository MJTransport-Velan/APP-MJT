<template>
  <AppCard class="pa-4" variant="outlined">
    <div class="d-flex justify-space-between align-start mb-2">
      <div>
        <div class="font-weight-medium">{{ invoice.invoiceNumber }}</div>
        <div class="text-caption text-medium-emphasis">{{ invoice.company.name }}</div>
      </div>
      <InvoiceStatusChip :status="invoice.status" />
    </div>
    <div class="d-flex justify-space-between text-body-2">
      <span>Total</span>
      <span class="font-weight-medium">{{ formatCurrency(invoice.totalAmount) }}</span>
    </div>
    <div class="d-flex justify-space-between text-body-2">
      <span>Outstanding</span>
      <span :class="invoice.outstandingAmount > 0 ? 'text-error' : 'text-success'" class="font-weight-medium">
        {{ formatCurrency(invoice.outstandingAmount) }}
      </span>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import type { Invoice } from '@/types/accounts.types';
import { formatCurrency } from '@/utils/format';
import { AppCard } from '@/components/ui';
import InvoiceStatusChip from './InvoiceStatusChip.vue';

defineProps<{ invoice: Invoice }>();
</script>
