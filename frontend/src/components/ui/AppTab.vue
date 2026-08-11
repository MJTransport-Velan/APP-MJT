<template>
  <button type="button" class="app-tab" :class="{ 'app-tab--active': isActive }" @click="active = value">
    <AppIcon v-if="prependIcon" :icon="prependIcon" size="small" />
    <slot />
  </button>
</template>

<script setup lang="ts">
import { inject, computed, type WritableComputedRef } from 'vue';
import AppIcon from './AppIcon.vue';

const props = defineProps<{ value: string | number; prependIcon?: string }>();
const active = inject<WritableComputedRef<string | number | undefined>>('app-tabs');
const isActive = computed(() => active?.value === props.value);
</script>

<style scoped>
.app-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 18px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-medium);
  border-bottom: 2px solid transparent;
  white-space: nowrap;
}
.app-tab:hover { color: var(--color-text); }
.app-tab--active { color: var(--color-primary); border-bottom-color: var(--color-primary); }
</style>
