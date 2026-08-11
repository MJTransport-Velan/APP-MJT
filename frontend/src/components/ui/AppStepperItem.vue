<template>
  <div class="app-stepper-item" :class="{ 'app-stepper-item--complete': complete, 'app-stepper-item--active': !complete }">
    <span class="app-stepper-item__circle">
      <AppIcon v-if="complete" icon="mdi-check" size="small" />
      <template v-else>{{ value }}</template>
    </span>
    <span class="app-stepper-item__title"><slot>{{ title }}</slot></span>
  </div>
</template>

<script setup lang="ts">
import AppIcon from './AppIcon.vue';

withDefaults(defineProps<{ value?: string | number; title?: string; complete?: boolean }>(), { complete: false });
</script>

<style scoped>
.app-stepper-item {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
}
.app-stepper-item__circle {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-divider);
  color: var(--color-text-medium);
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}
.app-stepper-item--active .app-stepper-item__circle { background: var(--color-primary); color: #fff; }
.app-stepper-item--complete .app-stepper-item__circle { background: var(--color-success); color: #fff; }
.app-stepper-item__title { font-size: 0.8125rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
