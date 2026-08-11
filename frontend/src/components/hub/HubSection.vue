<template>
  <section class="hub-section">
    <div class="hub-section__header">
      <AppIcon v-if="icon" :icon="icon" size="small" color="primary" />
      <h3 class="hub-section__title">{{ title }}</h3>
      <AppDivider class="hub-section__divider" />
    </div>
    <slot />
  </section>
</template>

<script setup lang="ts">
import { AppIcon, AppDivider } from '@/components/ui';

defineProps<{ title: string; icon?: string }>();
</script>

<style scoped>
.hub-section {
  margin-bottom: 28px;
}
.hub-section__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}
.hub-section__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
  white-space: nowrap;
}
.hub-section__divider {
  flex: 1 1 auto;
}
</style>
