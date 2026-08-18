<template>
  <div class="d-flex flex-wrap ga-2">
    <AppTextField
      :model-value="from"
      type="date"
      label="From"
      style="max-width: 170px"
      @update:model-value="onFrom"
    />
    <AppTextField
      :model-value="to"
      type="date"
      label="To"
      style="max-width: 170px"
      @update:model-value="onTo"
    />
  </div>
</template>

<script setup lang="ts">
import AppTextField from './AppTextField.vue';

defineProps<{ from: string | null; to: string | null }>();
const emit = defineEmits<{ 'update:from': [string]; 'update:to': [string]; change: [] }>();

function onFrom(value: string) {
  emit('update:from', value);
  emit('change');
}
function onTo(value: string) {
  emit('update:to', value);
  emit('change');
}
</script>
