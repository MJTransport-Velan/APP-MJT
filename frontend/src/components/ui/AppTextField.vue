<template>
  <div class="app-field" :class="[{ 'app-field--disabled': disabled, 'app-field--error': hasError }, $attrs.class]" :style="$attrs.style">
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
        v-bind="inputAttrs"
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
import { computed, useAttrs } from 'vue';
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
    /** Escape hatch for a field the label/placeholder heuristic below doesn't catch. */
    preserveCase?: boolean;
  }>(),
  { type: 'text', disabled: false, readonly: false, clearable: false, required: false, preserveCase: false }
);

defineOptions({ inheritAttrs: false });

// class/style size the field itself (call sites do `style="max-width: 160px"`),
// so they stay on the wrapper; every other attr — min, max, step, maxlength —
// belongs on the input.
const attrs = useAttrs();
const inputAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs;
  return rest;
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'click:appendInner': [];
}>();

const errorMessage = computed(() => {
  if (!props.errorMessages) return '';
  return Array.isArray(props.errorMessages) ? props.errorMessages[0] || '' : props.errorMessages;
});
const hasError = computed(() => !!errorMessage.value);

// Types where a value transform is meaningless or actively wrong (passwords
// especially — Login.vue's show/hide toggle flips type to 'text' at runtime,
// so this alone isn't sufficient; see the label/placeholder check below).
const NON_TEXT_TYPES = new Set(['number', 'date', 'time', 'datetime-local', 'month', 'week', 'color', 'file', 'hidden', 'password']);
// Case matters for identity/credential/reference/free-text fields — matched
// against the field's own label/placeholder so most call sites need no
// per-field opt-out. Keep in sync with the backend's equivalent list in
// backend/src/middlewares/uppercaseBody.middleware.ts.
const CASE_SENSITIVE_HINT =
  /password|user\s*name|e-?mail|remarks?|\bnotes?\b|description|reason|purpose|comment|url|link|webhook|token|secret|api\s*key|json|\bid\b|otp|signature|hash/i;

const preservesCase = computed(() => {
  if (props.preserveCase) return true;
  if (NON_TEXT_TYPES.has(props.type ?? 'text')) return true;
  return CASE_SENSITIVE_HINT.test(`${props.label ?? ''} ${props.placeholder ?? ''}`);
});

function onInput(event: Event) {
  const raw = (event.target as HTMLInputElement).value;
  emit('update:modelValue', preservesCase.value ? raw : raw.toUpperCase());
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
