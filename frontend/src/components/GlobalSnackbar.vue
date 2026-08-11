<template>
  <AppSnackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000" location="top right">
    {{ snackbar.text }}
  </AppSnackbar>
</template>

<script setup lang="ts">
import { AppSnackbar } from '@/components/ui';
import { useSnackbar } from '@/composables/useSnackbar';

const { snackbar } = useSnackbar();
</script>
