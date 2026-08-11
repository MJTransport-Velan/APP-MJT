<template>
  <span class="app-badge-wrap">
    <slot />
    <span v-if="dot" class="app-badge app-badge--dot" :class="`app-badge--${color || 'primary'}`"></span>
    <span v-else-if="content !== undefined" class="app-badge" :class="`app-badge--${color || 'primary'}`">{{ content }}</span>
  </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ color?: string; dot?: boolean; content?: string | number }>(), { dot: false });
</script>

<style scoped>
.app-badge-wrap { position: relative; display: inline-flex; }
.app-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: var(--radius-pill);
  background: var(--color-secondary);
  color: #fff;
  font-size: 0.625rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--color-surface);
}
.app-badge--dot { min-width: 10px; width: 10px; height: 10px; padding: 0; top: -2px; right: -2px; }
.app-badge--secondary { background: var(--color-secondary); }
.app-badge--error { background: var(--color-error); }
.app-badge--success { background: var(--color-success); }
.app-badge--warning { background: var(--color-warning); }
.app-badge--info { background: var(--color-info); }
</style>
