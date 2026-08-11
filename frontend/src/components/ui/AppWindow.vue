<template>
  <div class="app-window">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { provide, computed } from 'vue';

const props = defineProps<{ modelValue?: string | number }>();
const emit = defineEmits<{ 'update:modelValue': [value: string | number] }>();

const active = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v as string | number),
});

provide('app-window', active);
</script>

<style scoped>
.app-window { width: 100%; }
</style>
