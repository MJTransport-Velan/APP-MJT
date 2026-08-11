<template>
  <div class="app-skeleton" :class="`app-skeleton--${type || 'text'}`"></div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ type?: string }>(), {});
</script>

<style scoped>
.app-skeleton {
  background: linear-gradient(90deg, var(--color-hover) 25%, var(--color-divider) 37%, var(--color-hover) 63%);
  background-size: 400% 100%;
  animation: app-skeleton-shimmer 1.4s ease infinite;
  border-radius: var(--radius-sm);
  height: 16px;
  width: 100%;
}
.app-skeleton--card,
.app-skeleton--image { height: 120px; border-radius: var(--radius-lg); }
@keyframes app-skeleton-shimmer {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}
</style>
