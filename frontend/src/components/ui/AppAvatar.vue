<template>
  <span
    class="app-avatar"
    :class="`app-avatar--${color || 'default'}`"
    :style="sizeStyle"
  >
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(defineProps<{ color?: string; size?: string | number }>(), {
  size: 40,
});

const sizeStyle = computed(() => {
  const size = typeof props.size === "number" ? `${props.size}px` : props.size;
  return { width: size, height: size };
});
</script>

<style scoped>
.app-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(var(--color-primary-rgb), 0.14);
  color: var(--color-primary);
  flex-shrink: 0;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  user-select: none;
  width: 35px;
  height: 35px;
}
.app-avatar :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Colour variants — kept in the scoped block so they outrank the base rule
   above (a plain global `.app-avatar--x` loses to the scoped `.app-avatar`). */
.app-avatar--primary {
  background: var(--color-primary);
  color: var(--color-on-primary);
}
.app-avatar--secondary {
  background: var(--color-secondary);
  color: var(--color-on-secondary);
}
.app-avatar--error {
  background: var(--color-error);
  color: #fff;
}
.app-avatar--success {
  background: var(--color-success);
  color: #fff;
}
.app-avatar--warning {
  /* deeper than --color-warning so white content stays readable on it */
  background: #d97706;
  color: #fff;
}
.app-avatar--info {
  background: var(--color-info);
  color: #fff;
}
</style>
