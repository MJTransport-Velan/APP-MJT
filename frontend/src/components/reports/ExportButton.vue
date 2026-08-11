<template>
  <div class="d-flex ga-2">
    <AppMenu>
      <template #activator="{ props }">
        <AppBtn v-bind="props" variant="tonal" prepend-icon="mdi-download" :loading="exporting">Export</AppBtn>
      </template>
      <AppList density="compact">
        <AppListItem prepend-icon="mdi-file-excel-outline" title="Excel (.xlsx)" @click="$emit('export', 'xlsx')" />
        <AppListItem prepend-icon="mdi-file-pdf-box" title="PDF" @click="$emit('export', 'pdf')" />
        <AppListItem prepend-icon="mdi-file-delimited-outline" title="CSV" @click="$emit('export', 'csv')" />
      </AppList>
    </AppMenu>
    <AppBtn variant="tonal" prepend-icon="mdi-printer-outline" @click="$emit('print')">Print</AppBtn>
  </div>
</template>

<script setup lang="ts">
import { AppMenu, AppBtn, AppList, AppListItem } from '@/components/ui';

withDefaults(defineProps<{ exporting?: boolean }>(), { exporting: false });
defineEmits<{ export: [format: 'xlsx' | 'pdf' | 'csv']; print: [] }>();
</script>
