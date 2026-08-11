<template>
  <div class="app-stepper">
    <slot />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ modelValue?: string | number }>(), {});
</script>

<style scoped>
.app-stepper { width: 100%; }
</style>
