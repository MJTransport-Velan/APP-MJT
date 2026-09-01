<template>
  <AppCard class="date-filter pa-3 mb-4">
    <div class="date-filter__row">
      <AppDateRangePicker
        :from="dateFrom"
        :to="dateTo"
        @update:from="(v: string) => emit('update:dateFrom', v)"
        @update:to="(v: string) => emit('update:dateTo', v)"
      />

      <div class="date-filter__presets">
        <AppBtn
          v-for="preset in presets"
          :key="preset.label"
          size="small"
          variant="tonal"
          :color="activePreset === preset.label ? 'primary' : undefined"
          @click="emit('preset', preset)"
        >
          {{ preset.label }}
        </AppBtn>
        <AppBtn
          v-if="isActive"
          size="small"
          variant="text"
          prepend-icon="mdi-close"
          @click="emit('clear')"
        >
          Clear
        </AppBtn>
      </div>
    </div>

    <!--
      Without this line the screen silently mixes windows: some tiles are
      period figures that moved to the picked range, others are live
      balances that cannot be restated for a past date. Saying so is
      cheaper than a user reconciling two numbers that were never meant
      to agree.
    -->
    <p v-if="isActive" class="date-filter__note">
      {{ rangeLabel }}
      <span v-if="snapshotNote">{{ snapshotNote }}</span>
    </p>
  </AppCard>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { AppCard, AppBtn, AppDateRangePicker } from '@/components/ui';
import { formatDate } from '@/utils/format';
import { DATE_RANGE_PRESETS, type DateRangePreset } from '@/composables/useDateRangeFilter';

const props = withDefaults(
  defineProps<{
    dateFrom: string | null;
    dateTo: string | null;
    /** Which live-state figures on this screen the window deliberately does not touch. */
    snapshotNote?: string;
    presets?: DateRangePreset[];
  }>(),
  { snapshotNote: '', presets: () => DATE_RANGE_PRESETS }
);

const emit = defineEmits<{
  'update:dateFrom': [string];
  'update:dateTo': [string];
  preset: [DateRangePreset];
  clear: [];
}>();

const isActive = computed(() => Boolean(props.dateFrom || props.dateTo));

/** Reads correctly when the user has filled in only one end of the window. */
const rangeLabel = computed(() => {
  if (props.dateFrom && props.dateTo) return `Showing ${formatDate(props.dateFrom)} – ${formatDate(props.dateTo)}.`;
  if (props.dateFrom) return `Showing ${formatDate(props.dateFrom)} onwards.`;
  return `Showing everything up to ${formatDate(props.dateTo)}.`;
});

/** Highlights the preset button whose window is currently showing. */
const activePreset = computed(() => {
  if (!isActive.value) return null;
  return (
    props.presets.find((p) => {
      const r = p.range();
      return r.from === props.dateFrom && r.to === props.dateTo;
    })?.label ?? null
  );
});
</script>

<style scoped>
.date-filter__row {
  display: flex;
  flex-wrap: wrap;
  /* align-items: flex-end; */
  gap: 12px 16px;
}
.date-filter__presets {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.date-filter__note {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--color-text-medium);
}
</style>
