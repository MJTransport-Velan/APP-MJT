<template>
  <div class="app-timeline-item">
    <span class="app-timeline-item__dot" :class="`app-timeline-item__dot--${dotColor || 'primary'}`"></span>
    <div class="app-timeline-item__content"><slot /></div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ dotColor?: string; size?: string }>(), {});
</script>

<style scoped>
.app-timeline-item {
  position: relative;
  padding-bottom: 20px;
}
.app-timeline-item:last-child { padding-bottom: 0; }
.app-timeline-item__dot {
  position: absolute;
  left: -24px;
  top: 4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-primary);
  border: 2px solid var(--color-surface);
  box-shadow: 0 0 0 2px var(--color-divider);
}
.app-timeline-item__dot--secondary { background: var(--color-secondary); }
.app-timeline-item__dot--success { background: var(--color-success); }
.app-timeline-item__dot--error { background: var(--color-error); }
.app-timeline-item__dot--warning { background: var(--color-warning); }
.app-timeline-item__dot--info { background: var(--color-info); }
.app-timeline-item__dot--grey { background: var(--color-text-disabled); }
</style>
