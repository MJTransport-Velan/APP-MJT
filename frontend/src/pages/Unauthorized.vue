<template>
  <div class="status-page">
    <AppCard class="pa-10 text-center" elevation="6" max-width="480">
      <AppIcon icon="mdi-lock-alert-outline" size="56" color="error" class="mb-4" />
      <h2 class="text-h6 mb-2">Unauthorized</h2>
      <p class="text-medium-emphasis mb-6">You do not have permission to access this page.</p>
      <AppBtn color="primary" to="/dashboard">Back to Dashboard</AppBtn>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { AppCard, AppIcon, AppBtn } from '@/components/ui';
</script>

<style scoped>
.status-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  padding: 24px;
}
</style>
