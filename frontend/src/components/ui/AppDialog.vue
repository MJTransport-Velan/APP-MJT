<template>
  <Teleport to="body">
    <Transition name="app-dialog-fade">
      <div v-if="modelValue" class="app-dialog-overlay" @click="onOverlayClick">
        <div
          class="app-dialog"
          :style="{ maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth }"
          @click.stop
        >
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { watch } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    maxWidth?: string | number;
    persistent?: boolean;
  }>(),
  { maxWidth: 560, persistent: false }
);

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

function onOverlayClick() {
  if (props.persistent) return;
  emit('update:modelValue', false);
}

watch(
  () => props.modelValue,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : '';
  }
);
</script>

<style scoped>
.app-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 1000;
}
.app-dialog {
  width: 50%;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-3);
}
.app-dialog-fade-enter-active,
.app-dialog-fade-leave-active {
  transition: opacity 0.15s ease;
}
.app-dialog-fade-enter-from,
.app-dialog-fade-leave-to {
  opacity: 0;
}
</style>
