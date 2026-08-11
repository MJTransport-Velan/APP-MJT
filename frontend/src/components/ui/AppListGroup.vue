<template>
  <div class="app-list-group">
    <div class="app-list-group__activator" @click="open = !open">
      <slot name="activator" :props="{}" />
      <AppIcon
        icon="mdi-chevron-down"
        size="small"
        class="app-list-group__caret"
        :class="{ 'app-list-group__caret--open': open || forceOpen }"
      />
    </div>
    <div v-show="open || forceOpen" class="app-list-group__content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AppIcon from './AppIcon.vue';

withDefaults(defineProps<{ value?: string; forceOpen?: boolean }>(), { forceOpen: false });
const open = ref(false);
</script>

<style scoped>
.app-list-group__activator {
  position: relative;
  cursor: pointer;
}
.app-list-group__caret {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  transition: transform 0.15s ease;
  color: var(--color-text-medium);
  pointer-events: none;
}
.app-list-group__caret--open { transform: translateY(-50%) rotate(180deg); }
.app-list-group__content { padding-left: 4px; }
</style>
