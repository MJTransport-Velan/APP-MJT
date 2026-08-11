<template>
  <div class="app-field" :class="{ 'app-field--disabled': disabled, 'app-field--error': hasError }">
    <label v-if="label" class="app-field__label">{{ label }}<span v-if="required" class="app-field__required">*</span></label>
    <div class="app-field__control">
      <AppIcon v-if="prependInnerIcon" :icon="prependInnerIcon" size="small" class="app-field__icon" />
      <input
        class="app-field__input"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        v-bind="$attrs"
        @input="onInput"
      />
      <button
        v-if="clearable && modelValue"
        type="button"
        class="app-field__clear"
        tabindex="-1"
        @click="onClear"
      >
        <AppIcon icon="mdi-close" size="small" />
      </button>
      <AppIcon v-if="appendInnerIcon" :icon="appendInnerIcon" size="small" class="app-field__icon" @click="$emit('click:appendInner')" />
    </div>
    <div v-if="hint || errorMessage" class="app-field__hint">{{ errorMessage || hint }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppIcon from './AppIcon.vue';

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null;
    label?: string;
    type?: string;
    placeholder?: string;
    disabled?: boolean;
    readonly?: boolean;
    clearable?: boolean;
    prependInnerIcon?: string;
    appendInnerIcon?: string;
    hint?: string;
    errorMessages?: string | string[];
    required?: boolean;
  }>(),
  { type: 'text', disabled: false, readonly: false, clearable: false, required: false }
);

defineOptions({ inheritAttrs: false });

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'click:appendInner': [];
}>();

const errorMessage = computed(() => {
  if (!props.errorMessages) return '';
  return Array.isArray(props.errorMessages) ? props.errorMessages[0] || '' : props.errorMessages;
});
const hasError = computed(() => !!errorMessage.value);

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value);
}
function onClear() {
  emit('update:modelValue', '');
}
</script>

<style scoped>
.app-field {
  width: 100%;
  margin-bottom: 4px;
}
.app-field__label {
  display: block;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-medium);
  margin-bottom: 4px;
}
.app-field__required {
  color: var(--color-error);
  margin-left: 2px;
}
.app-field__control {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0 10px;
  height: 42px;
  background: var(--color-surface);
  transition: border-color 0.15s ease;
}
.app-field__control:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px var(--color-primary);
}
.app-field--error .app-field__control {
  border-color: var(--color-error);
}
.app-field--error .app-field__control:focus-within {
  box-shadow: 0 0 0 1px var(--color-error);
}
.app-field--disabled .app-field__control {
  background: var(--color-hover);
  opacity: 0.6;
}
.app-field__input {
  flex: 1 1 auto;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.875rem;
  color: var(--color-text);
  height: 100%;
  font-family: inherit;
}
.app-field__icon {
  color: var(--color-text-medium);
  flex-shrink: 0;
}
.app-field__clear {
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  color: var(--color-text-medium);
  padding: 0;
}
.app-field__hint {
  font-size: 0.6875rem;
  color: var(--color-text-medium);
  margin-top: 3px;
  padding: 0 2px;
}
.app-field--error .app-field__hint {
  color: var(--color-error);
}
</style>
