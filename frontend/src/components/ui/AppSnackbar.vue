<template>
  <Teleport to="body">
    <Transition name="app-snackbar-slide">
      <div
        v-if="modelValue"
        class="app-snackbar"
        :class="[`app-snackbar--${color || 'default'}`, `app-snackbar--${locationClass}`]"
      >
        <div class="app-snackbar__content"><slot /></div>
        <div v-if="$slots.actions" class="app-snackbar__actions"><slot name="actions" /></div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';

const props = withDefaults(
  defineProps<{ modelValue: boolean; color?: string; timeout?: number; location?: string }>(),
  { timeout: 4000, location: 'bottom' }
);

const locationClass = computed(() => props.location.trim().replace(/\s+/g, '-'));

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

let timer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => props.modelValue,
  (visible) => {
    if (timer) clearTimeout(timer);
    if (visible && props.timeout > 0) {
      timer = setTimeout(() => emit('update:modelValue', false), props.timeout);
    }
  }
);
</script>

<style scoped>
.app-snackbar {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 280px;
  max-width: 90vw;
  padding: 12px 18px;
  border-radius: var(--radius-md);
  background: #323232;
  color: #fff;
  box-shadow: var(--shadow-3);
  z-index: 1200;
  font-size: 0.875rem;
}
.app-snackbar__content { flex: 1 1 auto; }
.app-snackbar--success { background: var(--color-success); }
.app-snackbar--error { background: var(--color-error); }
.app-snackbar--warning { background: var(--color-warning); }
.app-snackbar--info { background: var(--color-info); }
.app-snackbar-slide-enter-active, .app-snackbar-slide-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.app-snackbar-slide-enter-from, .app-snackbar-slide-leave-to { opacity: 0; transform: translate(-50%, 12px); }

.app-snackbar--top {
  top: 24px;
  bottom: auto;
}
.app-snackbar--top-right,
.app-snackbar--right {
  left: auto;
  right: 24px;
  transform: none;
}
.app-snackbar--top-right {
  top: 24px;
  bottom: auto;
}
.app-snackbar--bottom-right {
  left: auto;
  right: 24px;
  bottom: 24px;
  transform: none;
}
</style>
