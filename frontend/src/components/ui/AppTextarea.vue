<template>
  <div class="app-field" :class="{ 'app-field--disabled': disabled }">
    <label v-if="label" class="app-field__label">{{ label }}</label>
    <textarea
      class="app-field__textarea"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :rows="Number(rows)"
      v-bind="$attrs"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    ></textarea>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue?: string | number;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    rows?: string | number;
  }>(),
  { rows: 3, disabled: false }
);
defineOptions({ inheritAttrs: false });
defineEmits<{ 'update:modelValue': [value: string] }>();
</script>

<style scoped>
.app-field { width: 100%; margin-bottom: 4px; }
.app-field__label {
  display: block;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-medium);
  margin-bottom: 4px;
}
.app-field__textarea {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px;
  font-size: 0.875rem;
  font-family: inherit;
  background: var(--color-surface);
  color: var(--color-text);
  resize: vertical;
  outline: none;
}
.app-field__textarea:focus { border-color: var(--color-primary); box-shadow: 0 0 0 1px var(--color-primary); }
.app-field--disabled .app-field__textarea { background: var(--color-hover); opacity: 0.6; }
</style>
