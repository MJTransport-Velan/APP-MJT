<template>
  <div class="app-btn-toggle">
    <slot />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ modelValue?: unknown; mandatory?: boolean; divided?: boolean }>(), {});
</script>

<style scoped>
.app-btn-toggle {
  display: inline-flex;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
</style>
