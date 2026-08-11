<template>
  <span class="app-progress-circular" :class="`app-progress-circular--${color || 'primary'}`" :style="style"></span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{ size?: string | number; width?: number; color?: string; indeterminate?: boolean }>(),
  { size: 32, width: 3, indeterminate: true }
);

const style = computed(() => {
  const size = typeof props.size === 'number' ? `${props.size}px` : props.size;
  return { width: size, height: size, borderWidth: `${props.width}px` };
});
</script>

<style scoped>
.app-progress-circular {
  display: inline-block;
  border-radius: 50%;
  border-style: solid;
  border-color: currentColor;
  border-right-color: transparent;
  animation: app-progress-spin 0.7s linear infinite;
}
.app-progress-circular--primary { color: var(--color-primary); }
.app-progress-circular--secondary { color: var(--color-secondary); }
.app-progress-circular--white { color: #fff; }
@keyframes app-progress-spin {
  to { transform: rotate(360deg); }
}
</style>
