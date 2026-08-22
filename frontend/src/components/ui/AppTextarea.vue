<template>
  <div class="app-field" :class="{ 'app-field--disabled': disabled, 'app-field--error': hasError }">
    <label v-if="label" class="app-field__label">{{ label }}</label>
    <textarea
      class="app-field__textarea"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :rows="Number(rows)"
      v-bind="$attrs"
      @input="onInput"
    ></textarea>
    <div v-if="hint || errorMessage" class="app-field__hint">{{ errorMessage || hint }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue?: string | number;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    rows?: string | number;
    hint?: string;
    errorMessages?: string | string[];
    /** Textareas in this app are almost always remarks/description/notes — free
     * text stays as typed by default. Opt in explicitly if a given textarea
     * genuinely needs uppercase. */
    uppercase?: boolean;
  }>(),
  { rows: 3, disabled: false, uppercase: false }
);
defineOptions({ inheritAttrs: false });
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const errorMessage = computed(() => {
  if (!props.errorMessages) return '';
  return Array.isArray(props.errorMessages) ? props.errorMessages[0] || '' : props.errorMessages;
});
const hasError = computed(() => !!errorMessage.value);

function onInput(event: Event) {
  const raw = (event.target as HTMLTextAreaElement).value;
  emit('update:modelValue', props.uppercase ? raw.toUpperCase() : raw);
}
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
.app-field--error .app-field__textarea { border-color: var(--color-error); }
.app-field--error .app-field__textarea:focus { box-shadow: 0 0 0 1px var(--color-error); }
.app-field__hint {
  font-size: 0.6875rem;
  color: var(--color-text-medium);
  margin-top: 3px;
  padding: 0 2px;
}
.app-field--error .app-field__hint { color: var(--color-error); }
</style>
