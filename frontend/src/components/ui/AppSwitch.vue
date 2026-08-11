<template>
  <label class="app-switch" :class="{ 'app-switch--disabled': disabled }">
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span class="app-switch__track"><span class="app-switch__thumb"></span></span>
    <span v-if="label" class="app-switch__label">{{ label }}</span>
  </label>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ modelValue?: boolean; label?: string; disabled?: boolean }>(), {
  modelValue: false,
  disabled: false,
});
defineEmits<{ 'update:modelValue': [value: boolean] }>();
</script>

<style scoped>
.app-switch { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }
.app-switch--disabled { opacity: 0.5; cursor: default; pointer-events: none; }
.app-switch input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.app-switch__track {
  width: 36px;
  height: 20px;
  border-radius: var(--radius-pill);
  background: var(--color-border);
  position: relative;
  transition: background-color 0.15s ease;
  flex-shrink: 0;
}
.app-switch__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: var(--shadow-1);
  transition: transform 0.15s ease;
}
.app-switch input:checked + .app-switch__track { background: var(--color-primary); }
.app-switch input:checked + .app-switch__track .app-switch__thumb { transform: translateX(16px); }
.app-switch__label { font-size: 0.875rem; }
</style>
