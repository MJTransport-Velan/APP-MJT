<template>
  <div class="hub-search">
    <AppIcon icon="mdi-magnify" size="small" class="hub-search__icon" />
    <input
      :value="modelValue"
      type="text"
      :placeholder="placeholder || 'Search this module...'"
      class="hub-search__input"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <button v-if="modelValue" type="button" class="hub-search__clear" @click="$emit('update:modelValue', '')">
      <AppIcon icon="mdi-close" size="x-small" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { AppIcon } from '@/components/ui';

defineProps<{ modelValue: string; placeholder?: string }>();
defineEmits<{ 'update:modelValue': [value: string] }>();
</script>

<style scoped>
.hub-search {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 0 14px;
  height: 44px;
  max-width: 360px;
  width: 100%;
}
.hub-search__icon {
  color: var(--color-text-disabled);
  flex-shrink: 0;
}
.hub-search__input {
  flex: 1 1 auto;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  height: 100%;
  color: var(--color-text);
  font-family: inherit;
}
.hub-search__input::placeholder {
  color: var(--color-text-disabled);
}
.hub-search__clear {
  border: none;
  background: transparent;
  color: var(--color-text-medium);
  cursor: pointer;
  display: flex;
  padding: 2px;
  flex-shrink: 0;
}
</style>
