<template>
  <div class="app-field">
    <label v-if="label" class="app-field__label">{{ label }}</label>
    <label class="app-file">
      <input type="file" class="app-file__input" :accept="accept" :multiple="multiple" @change="onChange" />
      <AppIcon icon="mdi-paperclip" size="small" />
      <span class="app-file__text">{{ fileNames || placeholder || 'Choose file' }}</span>
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppIcon from './AppIcon.vue';

const props = withDefaults(
  defineProps<{
    modelValue?: File | File[] | null;
    label?: string;
    accept?: string;
    multiple?: boolean;
    placeholder?: string;
  }>(),
  { multiple: false }
);

const emit = defineEmits<{ 'update:modelValue': [value: File | File[] | null] }>();

const fileNames = computed(() => {
  if (!props.modelValue) return '';
  if (Array.isArray(props.modelValue)) return props.modelValue.map((f) => f.name).join(', ');
  return props.modelValue.name;
});

function onChange(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) {
    emit('update:modelValue', props.multiple ? [] : null);
    return;
  }
  emit('update:modelValue', props.multiple ? Array.from(input.files) : input.files[0]);
}
</script>

<style scoped>
.app-field { width: 100%; margin-bottom: 4px; }
.app-field__label { display: block; font-size: 0.75rem; font-weight: 500; color: var(--color-text-medium); margin-bottom: 4px; }
.app-file {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--color-text-medium);
}
.app-file:hover { border-color: var(--color-primary); color: var(--color-primary); }
.app-file__input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.app-file__text { flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
