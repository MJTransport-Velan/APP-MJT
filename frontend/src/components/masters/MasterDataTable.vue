<template>
  <AppCard>
    <AppCardText>
      <div class="master-filter-row">
        <div class="master-filter-row__search">
          <AppTextField
            :model-value="search"
            label="Search"
            prepend-inner-icon="mdi-magnify"
            clearable
            hide-details
            @update:model-value="(v: string) => $emit('update:search', v)"
          />
        </div>
        <div v-if="$slots.filters" class="master-filter-row__filters">
          <slot name="filters" />
        </div>
        <ExcelExportButton variant="outlined" :loading="exporting" @click="onExportClick" />
      </div>
    </AppCardText>

    <AppDataTable
      v-model:items-per-page="pageSizeModel"
      v-model:page="pageModel"
      :headers="headers"
      :items="items"
      :items-length="itemsLength"
      :loading="loading"
      :item-label="itemLabel"
      :row-border-color="rowBorderColor"
      item-value="id"
      @update:options="$emit('update:options', $event)"
    >
      <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
        <slot :name="slotName" v-bind="slotProps ?? {}" />
      </template>
    </AppDataTable>
  </AppCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { AppCard, AppCardText, AppTextField, AppDataTable, ExcelExportButton } from '@/components/ui';
import { exportRowsToExcel, flattenValueForExport, type ExportColumn } from '@/utils/exportExcel';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';

const props = withDefaults(
  defineProps<{
    headers: Record<string, unknown>[];
    items: Record<string, unknown>[];
    itemsLength: number;
    loading?: boolean;
    search?: string;
    page?: number;
    pageSize?: number;
    itemLabel?: string;
    rowBorderColor?: (item: Record<string, unknown>, index: number) => string | undefined;
    /** Name for the downloaded file (without .xlsx) — defaults to itemLabel, then "export". */
    exportFilename?: string;
    /** Per-row transform for the exported sheet — falls back to a generic flattener (handles nested {name}-shaped relations, ISO dates) when not given. */
    exportRowMapper?: (item: Record<string, unknown>) => Record<string, unknown>;
    /** Overrides which columns appear in the export (and their order) — defaults to `headers` minus any Actions column. Use when a display column doesn't translate to a spreadsheet cell (e.g. a progress bar) or should split into more than one real column. */
    exportColumns?: ExportColumn[];
    /** Given the final mapped export rows, returns an extra row (e.g. column totals) appended to the sheet — omitted when not provided. */
    exportSummaryRow?: (rows: Record<string, unknown>[]) => Record<string, unknown> | null;
    /** Fetches every matching row (ignoring pagination) for a full export — falls back to exporting just the currently-loaded page when not given. */
    onExportAll?: () => Promise<Record<string, unknown>[]>;
  }>(),
  {
    loading: false,
    search: '',
    page: 1,
    pageSize: 10,
  }
);

const emit = defineEmits<{
  'update:options': [options: unknown];
  'update:search': [value: string];
  'update:page': [value: number];
  'update:pageSize': [value: number];
}>();

const pageModel = computed({
  get: () => props.page,
  set: (v: number) => emit('update:page', v),
});

const pageSizeModel = computed({
  get: () => props.pageSize,
  set: (v: number) => emit('update:pageSize', v),
});

const { success, error } = useSnackbar();
const exporting = ref(false);

const derivedExportColumns = computed<ExportColumn[]>(() =>
  props.headers
    .filter((h) => {
      const key = String(h.key ?? '');
      const title = String(h.title ?? '');
      return key && !/actions?$/i.test(key) && !/^actions?$/i.test(title);
    })
    .map((h) => ({ header: String(h.title), key: String(h.key) }))
);

async function onExportClick() {
  exporting.value = true;
  try {
    const sourceRows = props.onExportAll ? await props.onExportAll() : props.items;
    if (sourceRows.length === 0) {
      error('Nothing to export');
      return;
    }
    const columns = props.exportColumns || derivedExportColumns.value;
    const rows = sourceRows.map((item) => {
      if (props.exportRowMapper) return props.exportRowMapper(item);
      const flat: Record<string, unknown> = {};
      for (const col of columns) flat[col.key] = flattenValueForExport(item[col.key]);
      return flat;
    });
    const rowCount = rows.length;
    if (props.exportSummaryRow) {
      const summaryRow = props.exportSummaryRow(rows);
      if (summaryRow) rows.push(summaryRow);
    }
    const filename = props.exportFilename || props.itemLabel || 'export';
    await exportRowsToExcel(filename, columns, rows);
    success(`Exported ${rowCount} row${rowCount === 1 ? '' : 's'} to Excel`);
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to export'));
  } finally {
    exporting.value = false;
  }
}
</script>

<style scoped>
.master-filter-row {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  row-gap: 12px;
  gap: 12px;
}
.master-filter-row__search {
  flex: 0 0 240px;
  min-width: 200px;
}
.master-filter-row__filters {
  flex: 1 1 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
}
.master-filter-row__filters > :deep(*) {
  flex: 0 0 auto;
  width: auto !important;
  min-width: 140px;
}
/* Fields carry a bottom margin for stacked forms; in this single-row filter bar
   it would lift every input off the baseline the buttons sit on. */
.master-filter-row :deep(.app-field) {
  margin-bottom: 0 !important;
}
.master-filter-row :deep(.app-btn) {
  height: 42px !important;
}
</style>
