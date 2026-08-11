<template>
  <component
    :is="tag"
    class="app-list-item"
    :class="{ 'app-list-item--active': isActive, 'app-list-item--disabled': disabled }"
    :to="to"
    @click="!disabled && $emit('click', $event)"
  >
    <AppIcon v-if="prependIcon" :icon="prependIcon" class="app-list-item__prepend" />
    <span v-if="$slots.prepend" class="app-list-item__prepend"><slot name="prepend" /></span>
    <span class="app-list-item__content">
      <slot>
        <span v-if="title" class="app-list-item__title">{{ title }}</span>
        <span v-if="subtitle" class="app-list-item__subtitle">{{ subtitle }}</span>
      </slot>
    </span>
    <span v-if="$slots.append" class="app-list-item__append"><slot name="append" /></span>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import AppIcon from './AppIcon.vue';

const props = withDefaults(
  defineProps<{
    to?: string;
    title?: string;
    subtitle?: string;
    prependIcon?: string;
    disabled?: boolean;
    active?: boolean;
  }>(),
  { disabled: false, active: false }
);

defineEmits<{ click: [event: MouseEvent] }>();

const route = useRoute();
const tag = computed(() => (props.to ? RouterLink : 'div'));
const isActive = computed(() => props.active || (!!props.to && route.path === props.to));
</script>

<style scoped>
.app-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-lg);
  color: inherit;
  text-decoration: none;
  cursor: pointer;
  font-size: 0.875rem;
}
.app-list-item:hover { background: var(--color-hover); }
.app-list-item--active { background: rgba(var(--color-primary-rgb), 0.1); color: var(--color-primary); font-weight: 500; }
.app-list-item--disabled { opacity: 0.5; pointer-events: none; }
.app-list-item__prepend { display: flex; align-items: center; flex-shrink: 0; color: inherit; }
.app-list-item__content { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
.app-list-item__title { font-size: 0.875rem; }
.app-list-item__subtitle { font-size: 0.75rem; color: var(--color-text-medium); }
.app-list-item__append { flex-shrink: 0; }
</style>
