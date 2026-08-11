<template>
  <component :is="tag" class="app-card" :class="[`app-card--${variant}`, { 'app-card--flat': flat }]" :to="to">
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

const props = withDefaults(
  defineProps<{
    variant?: 'elevated' | 'outlined' | 'flat' | 'tonal';
    flat?: boolean;
    to?: string | Record<string, unknown>;
  }>(),
  { variant: 'elevated', flat: false }
);

const tag = computed(() => (props.to ? RouterLink : 'div'));
</script>

<style scoped>
.app-card {
  display: block;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  color: inherit;
  text-decoration: none;
  overflow: hidden;
}
.app-card--elevated { box-shadow: var(--shadow-3); }
.app-card--outlined { border: 1px solid var(--color-border); }
.app-card--tonal { background: rgba(var(--color-primary-rgb), 0.06); }
.app-card--flat { box-shadow: none; }
</style>
