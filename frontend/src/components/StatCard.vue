<template>
  <AppCard class="stat-card" variant="elevated">
    <div class="stat-icon" :style="{ background: iconBg }">
      <AppIcon :icon="icon" :color="iconColor" size="26" />
    </div>
    <div class="stat-content">
      <p class="stat-label">{{ label }}</p>
      <h3 class="stat-value">{{ value }}</h3>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { AppCard, AppIcon } from '@/components/ui';

withDefaults(
  defineProps<{
    label: string;
    value: string | number;
    icon: string;
    iconColor?: string;
    iconBg?: string;
  }>(),
  {
    iconColor: '#1E3A8A',
    iconBg: 'rgba(30, 58, 138, 0.1)',
  }
);
</script>

<style scoped>
.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 12px;
  height: 100%;
}

.stat-icon {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
  margin: 0 0 4px;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}
</style>
