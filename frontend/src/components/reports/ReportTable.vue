<template>
  <AppCard>
    <AppDataTable
      v-model:items-per-page="pageSizeModel"
      v-model:page="pageModel"
      :headers="headers"
      :items="items"
      :items-length="itemsLength"
      :loading="loading"
      item-value="__rowIndex"
      @update:options="$emit('update:options', $event)"
    >
      <template v-for="col in columns" :key="col.key" #[`item.${col.key}`]="{ item }">
        {{ formatCell((item as Record<string, unknown>)[col.key]) }}
      </template>
    </AppDataTable>
  </AppCard>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { AppCard, AppDataTable } from '@/components/ui';
import type { ReportColumn } from '@/types/reports.types';

const props = withDefaults(
  defineProps<{
    columns: ReportColumn[];
    items: Record<string, unknown>[];
    itemsLength: number;
    loading?: boolean;
    page?: number;
    pageSize?: number;
  }>(),
  { loading: false, page: 1, pageSize: 10 }
);

const emit = defineEmits<{
  'update:options': [options: unknown];
  'update:page': [value: number];
  'update:pageSize': [value: number];
}>();

const headers = computed(() => props.columns.map((c) => ({ title: c.label, key: c.key, sortable: false })));

const pageModel = computed({
  get: () => props.page,
  set: (v: number) => emit('update:page', v),
});
const pageSizeModel = computed({
  get: () => props.pageSize,
  set: (v: number) => emit('update:pageSize', v),
});

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T/;

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' && ISO_DATE_RE.test(value)) {
    return new Date(value).toLocaleDateString();
  }
  if (typeof value === 'number') return value.toLocaleString('en-IN');
  return String(value);
}
</script>
