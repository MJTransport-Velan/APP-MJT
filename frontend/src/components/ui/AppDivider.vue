<template>
  <hr v-if="!vertical" class="app-divider" />
  <span v-else class="app-divider app-divider--vertical"></span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ vertical?: boolean }>(), { vertical: false });
</script>

<style scoped>
.app-divider {
  border: none;
  border-top: 1px solid var(--color-divider);
  /* margin: 0; */
}
.app-divider--vertical {
  display: inline-block;
  width: 1px;
  align-self: stretch;
  border-top: none;
  border-left: 1px solid var(--color-divider);
}
</style>
