<template>
  <div
    ref="rootRef"
    class="app-field app-select"
    :class="{ 'app-field--disabled': disabled, 'app-field--error': hasError }"
  >
    <label v-if="label" class="app-field__label">{{ label }}<span v-if="required" class="app-field__required">*</span></label>
    <div
      ref="controlRef"
      class="app-field__control app-select__control"
      :class="{ 'app-select__control--open': open, 'app-select__control--multiple': multiple }"
      @mousedown="onControlMousedown"
    >
      <div v-if="multiple && selectedOptions.length" class="app-select__chips">
        <AppChip
          v-for="opt in selectedOptions"
          :key="String(opt.value)"
          size="small"
          closable
          @mousedown.stop.prevent
          @click:close="removeValue(opt.value)"
        >
          {{ opt.title }}
        </AppChip>
      </div>
      <input
        ref="inputRef"
        class="app-select__input"
        type="text"
        :value="inputValue"
        :placeholder="placeholderText"
        :disabled="disabled"
        autocomplete="off"
        role="combobox"
        aria-haspopup="listbox"
        :aria-expanded="open"
        @focus="onFocus"
        @input="onInput"
        @keydown="onKeydown"
        @blur="onBlur"
      />
      <button
        v-if="clearable && hasValue"
        type="button"
        class="app-field__clear"
        tabindex="-1"
        @mousedown.stop.prevent="onClear"
      >
        <AppIcon icon="mdi-close" size="small" />
      </button>
      <AppIcon
        icon="mdi-chevron-down"
        size="small"
        class="app-field__caret app-select__caret"
        :class="{ 'app-select__caret--open': open }"
      />
    </div>
    <Teleport to="body">
      <Transition name="app-select-fade">
        <ul
          v-if="open"
          ref="panelRef"
          class="app-select__panel"
          role="listbox"
          :aria-multiselectable="multiple"
          :style="panelStyle"
        >
          <li v-if="filteredItems.length === 0" class="app-select__empty">{{ emptyText }}</li>
          <li
            v-for="(opt, idx) in filteredItems"
            :key="String(opt.value)"
            class="app-select__option"
            :class="{
              'app-select__option--selected': isSelected(opt.value),
              'app-select__option--active': idx === activeIndex,
            }"
            role="option"
            :aria-selected="isSelected(opt.value)"
            @mousedown.prevent
            @click="selectOption(opt)"
            @mouseenter="activeIndex = idx"
          >
            <span class="app-select__option-text">{{ opt.title }}</span>
            <AppIcon v-if="isSelected(opt.value)" icon="mdi-check" size="small" class="app-select__check" />
          </li>
        </ul>
      </Transition>
    </Teleport>
    <div v-if="hint || errorMessage" class="app-field__hint">{{ errorMessage || hint }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import AppIcon from './AppIcon.vue';
import AppChip from './AppChip.vue';

type SelectItem = string | number | Record<string, unknown>;
type NormalizedOption = { title: string; value: unknown };

const props = withDefaults(
  defineProps<{
    modelValue?: any;
    items?: SelectItem[];
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    multiple?: boolean;
    clearable?: boolean;
    itemTitle?: string;
    itemValue?: string;
    hint?: string;
    errorMessages?: string | string[];
    required?: boolean;
  }>(),
  { items: () => [], disabled: false, multiple: false, clearable: true, required: false }
);

const emit = defineEmits<{ 'update:modelValue': [value: any] }>();

const rootRef = ref<HTMLElement | null>(null);
const controlRef = ref<HTMLElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);
const open = ref(false);
const query = ref('');
const activeIndex = ref(-1);
const panelStyle = ref<{ top: string; left: string; width: string }>({ top: '0px', left: '0px', width: '0px' });

// The panel is teleported to <body> so it can't be clipped by an ancestor
// dialog/card's overflow:hidden or overflow:auto — it's positioned via a
// fixed-position rect computed from the control instead of CSS anchoring.
function updatePanelPosition() {
  const control = controlRef.value;
  if (!control) return;
  const rect = control.getBoundingClientRect();
  panelStyle.value = {
    top: `${rect.bottom + 6}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
  };
}

function onReposition() {
  if (open.value) updatePanelPosition();
}

const errorMessage = computed(() => {
  if (!props.errorMessages) return '';
  return Array.isArray(props.errorMessages) ? props.errorMessages[0] || '' : props.errorMessages;
});
const hasError = computed(() => !!errorMessage.value);

const normalizedItems = computed<NormalizedOption[]>(() =>
  props.items.map((item) => {
    if (item !== null && typeof item === 'object') {
      const record = item as Record<string, unknown>;
      const titleKey = props.itemTitle || 'title';
      const valueKey = props.itemValue || 'value';
      return { title: String(record[titleKey] ?? ''), value: record[valueKey] };
    }
    return { title: String(item), value: item };
  })
);

const hasValue = computed(() => {
  if (props.multiple) return Array.isArray(props.modelValue) && props.modelValue.length > 0;
  return props.modelValue !== null && props.modelValue !== undefined && props.modelValue !== '';
});

const singleSelectedTitle = computed(() => {
  const match = normalizedItems.value.find((opt) => opt.value == props.modelValue);
  return match ? match.title : '';
});

const selectedOptions = computed(() => {
  const values: any[] = Array.isArray(props.modelValue) ? props.modelValue : [];
  return normalizedItems.value.filter((opt) => values.some((v) => v == opt.value));
});

const filteredItems = computed(() => {
  const q = query.value.trim().toLowerCase();
  let list = normalizedItems.value;
  if (props.multiple) list = list.filter((opt) => !isSelected(opt.value));
  if (!q) return list;
  return list.filter((opt) => opt.title.toLowerCase().includes(q));
});

const emptyText = computed(() => {
  if (normalizedItems.value.length === 0) return 'No options available';
  if (props.multiple && !query.value) return 'All options selected';
  return `No matches for "${query.value}"`;
});

// While closed the field shows the committed selection; while open it becomes
// a free-typing search buffer (multi-select never echoes into the text itself,
// selections are shown as chips instead).
const inputValue = computed(() => {
  if (open.value) return query.value;
  return props.multiple ? '' : singleSelectedTitle.value;
});

// While searching, surface the previously selected item as the placeholder so
// the user still sees what's chosen even though the text was cleared for typing.
const placeholderText = computed(() => {
  if (open.value && !props.multiple && hasValue.value) return singleSelectedTitle.value;
  return props.placeholder || '';
});

function isSelected(value: unknown) {
  if (props.multiple) {
    return Array.isArray(props.modelValue) && props.modelValue.some((v) => v == value);
  }
  return props.modelValue == value;
}

function onControlMousedown(event: MouseEvent) {
  if (props.disabled) return;
  if (event.target === inputRef.value) return;
  event.preventDefault();
  inputRef.value?.focus();
}

function onFocus() {
  if (props.disabled) return;
  open.value = true;
  query.value = '';
  activeIndex.value = props.multiple
    ? (filteredItems.value.length ? 0 : -1)
    : normalizedItems.value.findIndex((opt) => isSelected(opt.value));
  nextTick(updatePanelPosition);
}

function onInput(event: Event) {
  query.value = (event.target as HTMLInputElement).value;
  open.value = true;
  activeIndex.value = filteredItems.value.length ? 0 : -1;
}

function close() {
  open.value = false;
  query.value = '';
  activeIndex.value = -1;
}

function onBlur() {
  close();
}

function selectOption(opt: NormalizedOption) {
  if (props.multiple) {
    const current: any[] = Array.isArray(props.modelValue) ? [...props.modelValue] : [];
    current.push(opt.value);
    emit('update:modelValue', current);
    query.value = '';
    activeIndex.value = filteredItems.value.length ? 0 : -1;
    inputRef.value?.focus();
  } else {
    emit('update:modelValue', opt.value);
    close();
  }
}

function removeValue(value: unknown) {
  const current: any[] = Array.isArray(props.modelValue) ? props.modelValue.filter((v) => v != value) : [];
  emit('update:modelValue', current);
}

function onClear() {
  emit('update:modelValue', props.multiple ? [] : '');
  query.value = '';
  activeIndex.value = -1;
  inputRef.value?.focus();
}

function onKeydown(event: KeyboardEvent) {
  if (props.disabled) return;
  if (event.key === 'Backspace' && props.multiple && !query.value) {
    const current: any[] = Array.isArray(props.modelValue) ? props.modelValue : [];
    if (current.length) emit('update:modelValue', current.slice(0, -1));
    return;
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    if (!open.value) {
      open.value = true;
    } else if (activeIndex.value >= 0 && filteredItems.value[activeIndex.value]) {
      selectOption(filteredItems.value[activeIndex.value]);
    }
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    if (!open.value) {
      onFocus();
      return;
    }
    activeIndex.value = Math.min(activeIndex.value + 1, filteredItems.value.length - 1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    if (!open.value) {
      onFocus();
      return;
    }
    activeIndex.value = Math.max(activeIndex.value - 1, 0);
  } else if (event.key === 'Escape') {
    close();
    inputRef.value?.blur();
  } else if (event.key === 'Tab') {
    close();
  }
}

function onClickOutside(event: MouseEvent) {
  const target = event.target as Node;
  const insideRoot = rootRef.value?.contains(target);
  const insidePanel = panelRef.value?.contains(target);
  if (open.value && !insideRoot && !insidePanel) {
    close();
  }
}

onMounted(() => {
  document.addEventListener('click', onClickOutside, true);
  window.addEventListener('resize', onReposition);
  window.addEventListener('scroll', onReposition, true);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside, true);
  window.removeEventListener('resize', onReposition);
  window.removeEventListener('scroll', onReposition, true);
});
</script>

<style scoped>
.app-field { width: 100%; margin-bottom: 4px; }
.app-select { position: relative; }
.app-field__label {
  display: block;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-medium);
  margin-bottom: 6px;
}
.app-field__required {
  color: var(--color-error);
  margin-left: 2px;
}
.app-field__control.app-select__control {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0 10px;
  min-height: 42px;
  background: var(--color-surface);
  cursor: text;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.app-select__control--multiple { flex-wrap: wrap; padding: 6px 10px; }
.app-select__control:hover { border-color: rgba(var(--color-primary-rgb), 0.45); }
.app-select__control:focus-within,
.app-select__control--open { border-color: var(--color-primary); box-shadow: 0 0 0 1px var(--color-primary); }
.app-field--disabled .app-select__control { background: var(--color-hover); opacity: 0.6; cursor: not-allowed; pointer-events: none; }
.app-field--error .app-select__control { border-color: var(--color-error); }
.app-field--error .app-select__control:focus-within,
.app-field--error .app-select__control--open { box-shadow: 0 0 0 1px var(--color-error); }

.app-select__chips { display: flex; flex-wrap: wrap; gap: 4px; }

.app-select__input {
  flex: 1 1 60px;
  min-width: 60px;
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.875rem;
  color: var(--color-text);
  font-family: inherit;
  height: 40px;
}
.app-select__control--multiple .app-select__input { height: 26px; }
.app-select__input::placeholder { color: var(--color-text-disabled); }

.app-field__caret,
.app-field__clear { color: var(--color-text-medium); flex-shrink: 0; }
.app-select__caret { transition: transform 0.15s ease, color 0.15s ease; }
.app-select__caret--open { transform: rotate(180deg); color: var(--color-primary); }
.app-field__clear { border: none; background: transparent; cursor: pointer; display: flex; padding: 0; }

.app-field__hint {
  font-size: 0.6875rem;
  color: var(--color-text-medium);
  margin-top: 3px;
  padding: 0 2px;
}
.app-field--error .app-field__hint { color: var(--color-error); }

.app-select__panel {
  position: fixed;
  margin: 0;
  padding: 6px;
  list-style: none;
  background: var(--color-surface);
  border: 1px solid var(--color-divider);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-3);
  max-height: 264px;
  overflow-y: auto;
  z-index: 2000;
}
.app-select__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 10px;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  line-height: 1.3;
  color: var(--color-text);
  cursor: pointer;
  transition: background-color 0.1s ease;
}
.app-select__option-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-select__option--active { background: var(--color-hover); }
.app-select__option--selected { color: var(--color-primary); font-weight: 500; background: rgba(var(--color-primary-rgb), 0.08); }
.app-select__option--selected.app-select__option--active { background: rgba(var(--color-primary-rgb), 0.14); }
.app-select__check { color: var(--color-primary); flex-shrink: 0; }
.app-select__empty { padding: 10px; font-size: 0.8125rem; color: var(--color-text-medium); text-align: center; }

.app-select-fade-enter-active,
.app-select-fade-leave-active { transition: opacity 0.12s ease, transform 0.12s ease; }
.app-select-fade-enter-from,
.app-select-fade-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
