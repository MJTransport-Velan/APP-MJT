<template>
  <div class="status-page">
    <AppCard class="pa-10 text-center" elevation="6" max-width="480">
      <h1 class="status-code">404</h1>
      <h2 class="text-h6 mb-2">Page Not Found</h2>
      <p class="text-medium-emphasis mb-6">The page you are looking for does not exist or has been moved.</p>
      <AppBtn color="primary" to="/dashboard">Back to Dashboard</AppBtn>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { AppCard, AppBtn } from '@/components/ui';
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

.status-code {
  font-size: 64px;
  font-weight: 800;
  color: #1e3a8a;
  margin-bottom: 8px;
}
</style>
