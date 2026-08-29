<template>
  <div class="app-field" :class="[{ 'app-field--disabled': disabled, 'app-field--error': hasError }, $attrs.class]" :style="$attrs.style">
    <label v-if="label" class="app-field__label">{{ label }}<span v-if="required" class="app-field__required">*</span></label>
    <div class="app-field__control">
      <AppIcon v-if="prependInnerIcon" :icon="prependInnerIcon" size="small" class="app-field__icon" />
      <!--
        The value is written through syncInput() rather than bound with
        :value — see the number modifier below, which needs to leave the box
        alone while a decimal is still being typed.
      -->
      <input
        ref="inputEl"
        class="app-field__input"
        :type="type"
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
import { computed, onMounted, ref, useAttrs, watch } from 'vue';
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
    /**
     * Vue applies `.number` / `.trim` itself only on a native <input>. On a
     * component it just hands the modifiers over as this prop and expects the
     * component to act on them — so `v-model.number` here was inert, and every
     * numeric field in the app was posting the raw string the box contained
     * ("Expected number, received string" from the server's Zod schemas).
     * Honouring them here fixes all of those call sites at once.
     */
    modelModifiers?: { number?: boolean; trim?: boolean };
  }>(),
  {
    type: 'text',
    disabled: false,
    readonly: false,
    clearable: false,
    required: false,
    preserveCase: false,
    modelModifiers: () => ({}),
  }
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
  'update:modelValue': [value: string | number | undefined];
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
  /password|user\s*name|e-?mail|remarks?|\bnotes?\b|description|reason|purpose|comment|url|link|webhook|token|secret|api\s*key|json|\bid\b|otp|signature|hash|payment\s*term/i;

const preservesCase = computed(() => {
  if (props.preserveCase) return true;
  if (NON_TEXT_TYPES.has(props.type ?? 'text')) return true;
  return CASE_SENSITIVE_HINT.test(`${props.label ?? ''} ${props.placeholder ?? ''}`);
});

/**
 * Vue's own rule for `.number`: text that doesn't parse is kept as text, so a
 * half-typed "-" or "1e" isn't replaced by NaN while the user is still typing.
 */
function looseToNumber(raw: string): string | number {
  const parsed = parseFloat(raw);
  return Number.isNaN(parsed) ? raw : parsed;
}

function transformInput(raw: string): string | number | undefined {
  if (props.modelModifiers.number) {
    // An emptied numeric box means "no value", not the empty string — these
    // forms type their numbers as `number | undefined`, and emitting '' would
    // fail the very server-side check this modifier exists to satisfy.
    if (raw.trim() === '') return undefined;
    return looseToNumber(raw);
  }
  const value = props.modelModifiers.trim ? raw.trim() : raw;
  return preservesCase.value ? value : value.toUpperCase();
}

const inputEl = ref<HTMLInputElement | null>(null);

/**
 * Pushes the model back into the box, except while a number is mid-flight.
 *
 * Writing String(modelValue) back mid-typing would delete the character just
 * entered and make decimals impossible. Two cases have to be let through:
 *
 *  - "12.50" parses to the 12.5 the model already holds.
 *  - A half-typed "12." or "-" in an <input type="number"> is reported by the
 *    DOM as value "" (HTML value sanitization, browsers and jsdom alike) even
 *    though the user can see their text — and "" transforms to undefined, so
 *    an empty box and an empty model are the same state, not a difference to
 *    correct.
 *
 * Vue's native v-model carries the equivalent guard; this component needs its
 * own because the value is not bound with :value.
 */
function syncInput() {
  const el = inputEl.value;
  if (!el) return;
  if (props.modelModifiers.number && el === document.activeElement) {
    const shown = looseToNumber(el.value);
    const modelIsEmpty = props.modelValue == null || props.modelValue === '';
    if (shown === props.modelValue || (shown === '' && modelIsEmpty)) return;
  }
  const next = props.modelValue == null ? '' : String(props.modelValue);
  if (el.value !== next) el.value = next;
}

watch(() => props.modelValue, syncInput, { flush: 'post' });
onMounted(syncInput);

function onInput(event: Event) {
  emit('update:modelValue', transformInput((event.target as HTMLInputElement).value));
}
function onClear() {
  emit('update:modelValue', props.modelModifiers.number ? undefined : '');
  // Clearing an already-empty numeric field leaves modelValue at undefined, so
  // the watcher above has nothing to react to — blank the box directly.
  if (inputEl.value) inputEl.value.value = '';
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
