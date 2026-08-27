<template>
  <Teleport to="body">
    <Transition name="app-dialog-fade">
      <div v-if="modelValue" ref="overlayRef" class="app-dialog-overlay" @click="onOverlayClick">
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
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { isPopupOpen } from '@/composables/useEscapeBack';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    maxWidth?: string | number;
    persistent?: boolean;
  }>(),
  { maxWidth: 560, persistent: false }
);

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

const overlayRef = ref<HTMLElement | null>(null);

function onOverlayClick() {
  if (props.persistent) return;
  emit('update:modelValue', false);
}

/**
 * Escape closes the dialog, same as clicking the backdrop. Marked handled so
 * the app-wide Escape-goes-back handler leaves the page underneath alone, and
 * only the topmost dialog reacts when they are stacked.
 */
function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !props.modelValue || props.persistent) return;
  if (event.defaultPrevented || isPopupOpen()) return;
  const overlays = document.querySelectorAll('.app-dialog-overlay');
  if (overlays.length && overlays[overlays.length - 1] !== overlayRef.value) return;
  event.preventDefault();
  emit('update:modelValue', false);
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));

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
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-3);
}
@media (min-width: 600px) {
  .app-dialog {
    width: 50%;
  }
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
