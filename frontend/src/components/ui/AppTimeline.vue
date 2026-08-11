<template>
  <div class="app-timeline" :class="{ 'app-timeline--dense': density === 'compact' }">
    <slot />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ density?: string; side?: string }>(), {});
</script>

<style scoped>
.app-timeline {
  position: relative;
  padding-left: 24px;
}
.app-timeline::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 4px;
  bottom: 4px;
  width: 2px;
  background: var(--color-divider);
}
</style>
