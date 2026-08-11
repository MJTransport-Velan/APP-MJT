<template>
  <div class="app-list" :class="{ 'app-list--nav': nav }">
    <slot />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ nav?: boolean; density?: string }>(), { nav: false });
</script>

<style scoped>
.app-list { padding: 8px 0; }
.app-list--nav { padding: 4px 8px; }
</style>
