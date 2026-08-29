<template>
  <!--
    From/To always sit side by side: the pair is one filter, so it must not
    break across two rows and push the rest of a filter bar out of alignment.
  -->
  <div class="date-range">
    <AppTextField
      :model-value="from"
      type="date"
      label="From"
      class="date-range__field"
      @update:model-value="onFrom"
    />
    <AppTextField
      :model-value="to"
      type="date"
      label="To"
      class="date-range__field"
      @update:model-value="onTo"
    />
  </div>
</template>

<script setup lang="ts">
import AppTextField from './AppTextField.vue';

defineProps<{ from: string | null; to: string | null }>();
const emit = defineEmits<{ 'update:from': [string]; 'update:to': [string]; change: [] }>();

// AppTextField's emit is widened for `.number` call sites; a date field only
// ever hands back a string, so narrow it here rather than leaking the union out.
function onFrom(value: string | number | undefined) {
  emit('update:from', String(value ?? ''));
  emit('change');
}
function onTo(value: string | number | undefined) {
  emit('update:to', String(value ?? ''));
  emit('change');
}
</script>

<style scoped>
.date-range {
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-end;
  gap: 8px;
}
.date-range__field {
  flex: 0 0 165px;
  width: 165px;
}
/* Phone widths: the pair has nowhere to go sideways, so let it stack again. */
@media (max-width: 599px) {
  .date-range {
    flex-wrap: wrap;
  }
  .date-range__field {
    flex: 1 1 140px;
    width: auto;
  }
}
</style>
