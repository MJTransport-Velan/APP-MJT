<template>
  <div class="app-tabs" role="tablist">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { provide, computed } from "vue";

const props = defineProps<{ modelValue?: string | number }>();
const emit = defineEmits<{ "update:modelValue": [value: string | number] }>();

const active = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v as string | number),
});

provide("app-tabs", active);
</script>

<style scoped>
.app-tabs {
  display: flex;
  /* gap: 4px; */
  border-bottom: 1px solid var(--color-divider);
  overflow-x: auto;
}
</style>
