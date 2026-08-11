<template>
  <div class="app-menu" ref="rootRef">
    <div class="app-menu__activator" @click="onActivatorClick">
      <slot name="activator" :props="{}" />
    </div>
    <Transition name="app-menu-fade">
      <div v-if="open" class="app-menu__content" :class="`app-menu__content--${placement}`" @click="open = false">
        <slot />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';

withDefaults(defineProps<{ placement?: 'top' | 'bottom' }>(), { placement: 'bottom' });

const open = ref(false);
const rootRef = ref<HTMLElement | null>(null);

// preventDefault + stopPropagation so an activator nested inside a
// RouterLink (e.g. the sidebar's quick-link chevron) toggles the menu
// instead of triggering the link's own navigation.
function onActivatorClick(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
  open.value = !open.value;
}

function onClickOutside(event: MouseEvent) {
  if (rootRef.value && !rootRef.value.contains(event.target as Node)) {
    open.value = false;
  }
}

onMounted(() => document.addEventListener('click', onClickOutside, true));
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside, true));
</script>

<style scoped>
.app-menu { position: relative; display: inline-block; }
.app-menu__content {
  position: absolute;
  right: 0;
  min-width: 180px;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-3);
  z-index: 100;
  padding: 6px;
}
.app-menu__content--bottom { top: calc(100% + 6px); }
.app-menu__content--top { bottom: calc(100% + 6px); }
.app-menu-fade-enter-active, .app-menu-fade-leave-active { transition: opacity 0.12s ease, transform 0.12s ease; }
.app-menu-fade-enter-from, .app-menu-fade-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
