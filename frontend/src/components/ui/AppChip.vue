<template>
  <span class="app-chip" :class="[`app-chip--${color || 'default'}`, `app-chip--${size}`, `app-chip--${variant}`]">
    <AppIcon v-if="prependIcon" :icon="prependIcon" size="small" class="app-chip__icon" />
    <span class="app-chip__content"><slot /></span>
    <button v-if="closable" type="button" class="app-chip__close" @click.stop="$emit('click:close')">
      <AppIcon icon="mdi-close" size="small" />
    </button>
  </span>
</template>

<script setup lang="ts">
import AppIcon from './AppIcon.vue';

withDefaults(
  defineProps<{
    color?: string;
    size?: 'x-small' | 'small' | 'default' | 'large';
    variant?: 'flat' | 'outlined' | 'tonal';
    prependIcon?: string;
    closable?: boolean;
  }>(),
  { size: 'default', variant: 'tonal', closable: false }
);

defineEmits<{ 'click:close': [] }>();
</script>

<style scoped>
.app-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 10px;
  border-radius: var(--radius-pill);
  font-size: 0.75rem;
  font-weight: 500;
  background: rgba(0, 0, 0, 0.08);
  color: var(--color-text);
  white-space: nowrap;
}
.app-chip--small { height: 22px; padding: 0 8px; font-size: 0.6875rem; }
.app-chip--x-small { height: 18px; padding: 0 6px; font-size: 0.625rem; }
.app-chip--large { height: 32px; padding: 0 14px; font-size: 0.8125rem; }
.app-chip--outlined { background: transparent; border: 1px solid var(--color-border); }
.app-chip__close {
  display: inline-flex;
  border: none;
  background: transparent;
  padding: 0;
  margin-left: 2px;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
}
.app-chip__close:hover { opacity: 1; }
</style>

<style>
.app-chip--primary { background: rgba(var(--color-primary-rgb), 0.14); color: var(--color-primary); }
.app-chip--secondary { background: rgba(var(--color-secondary-rgb), 0.16); color: var(--color-secondary); }
.app-chip--error { background: color-mix(in srgb, var(--color-error) 14%, transparent); color: var(--color-error); }
.app-chip--success { background: color-mix(in srgb, var(--color-success) 14%, transparent); color: var(--color-success); }
.app-chip--warning { background: color-mix(in srgb, var(--color-warning) 16%, transparent); color: var(--color-warning); }
.app-chip--info { background: color-mix(in srgb, var(--color-info) 14%, transparent); color: var(--color-info); }
.app-chip--grey { background: rgba(0, 0, 0, 0.08); color: var(--color-text-medium); }
</style>
