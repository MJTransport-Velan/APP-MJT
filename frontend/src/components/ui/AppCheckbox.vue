<template>
  <label class="app-checkbox" :class="{ 'app-checkbox--disabled': disabled }">
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span class="app-checkbox__box"><AppIcon v-if="modelValue" icon="mdi-check" size="small" /></span>
    <span v-if="label || $slots.default" class="app-checkbox__label"><slot>{{ label }}</slot></span>
  </label>
</template>

<script setup lang="ts">
import AppIcon from './AppIcon.vue';

withDefaults(defineProps<{ modelValue?: boolean; label?: string; disabled?: boolean }>(), {
  modelValue: false,
  disabled: false,
});
defineEmits<{ 'update:modelValue': [value: boolean] }>();
</script>

<style scoped>
.app-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}
.app-checkbox--disabled { opacity: 0.5; cursor: default; pointer-events: none; }
.app-checkbox input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.app-checkbox__box {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 2px solid var(--color-text-medium);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}
.app-checkbox input:checked + .app-checkbox__box {
  background: var(--color-primary);
  border-color: var(--color-primary);
}
.app-checkbox__label { font-size: 0.875rem; }
</style>
