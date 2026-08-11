<template>
  <AppCard class="pa-3" variant="outlined">
    <div class="d-flex align-center ga-3">
      <AppAvatar size="48" rounded="lg" color="primary">
        <img v-if="vehicle.photo" :src="apiOrigin + vehicle.photo" class="app-img" />
        <AppIcon v-else icon="mdi-truck-outline" color="white" />
      </AppAvatar>
      <div class="flex-grow-1">
        <div class="font-weight-medium">{{ vehicle.registrationNumber }}</div>
        <div class="text-caption text-medium-emphasis">{{ vehicle.vehicleType?.name || '—' }}</div>
      </div>
      <VehicleStatusChip :status="vehicle.status" />
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { AppCard, AppAvatar, AppIcon } from '@/components/ui';
import type { FleetVehicle } from '@/types/fleet.types';
import VehicleStatusChip from './VehicleStatusChip.vue';

defineProps<{ vehicle: FleetVehicle }>();

const apiOrigin = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
</script>

<style scoped>
.app-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
