<template>
  <div>
    <h2 class="text-h6 mb-4">My Profile</h2>

    <div class="row">
      <div class="col-12 col-md-4">
        <AppCard class="pa-6 text-center">
          <AppAvatar size="96" color="primary" class="mb-3">
            <img v-if="authStore.user?.profilePhoto" :src="apiOrigin + authStore.user.profilePhoto" class="app-img" />
            <span v-else class="text-h5 text-white">{{ initials }}</span>
          </AppAvatar>
          <div class="text-subtitle-1 font-weight-medium">{{ authStore.user?.fullName }}</div>
          <div class="text-caption text-medium-emphasis mb-3">@{{ authStore.user?.username }}</div>

          <div>
            <AppChip v-for="role in authStore.user?.roles" :key="role" size="small" class="mr-1 mb-1">{{ role }}</AppChip>
          </div>

          <AppFileInput
            v-model="photoFile"
            label="Upload new photo"
            accept="image/png, image/jpeg, image/webp"
            prepend-icon="mdi-camera-outline"
            class="mt-4"
            hide-details
            density="compact"
            @update:model-value="onPhotoSelected"
          />
        </AppCard>
      </div>

      <div class="col-12 col-md-8">
        <AppCard class="pa-4 mb-4">
          <AppCardTitle class="text-subtitle-1">Profile Details</AppCardTitle>
          <AppCardText>
            <div class="row">
              <div class="col-12 col-sm-6">
                <AppTextField v-model="profileForm.fullName" label="Full Name" />
              </div>
              <div class="col-12 col-sm-6">
                <AppTextField v-model="profileForm.email" label="Email" />
              </div>
              <div class="col-12 col-sm-6">
                <AppTextField v-model="profileForm.phone" label="Phone" />
              </div>
              <div class="col-12 col-sm-6">
                <AppTextField :model-value="authStore.user?.username" label="Username" disabled />
              </div>
            </div>
          </AppCardText>
          <AppCardActions>
            <div class="spacer"></div>
            <AppBtn color="primary" variant="flat" :loading="savingProfile" @click="onSaveProfile">Save Changes</AppBtn>
          </AppCardActions>
        </AppCard>

        <AppCard class="pa-4">
          <AppCardTitle class="text-subtitle-1">Change Password</AppCardTitle>
          <AppCardText>
            <div class="row">
              <div class="col-12 col-sm-6">
                <AppTextField v-model="passwordForm.currentPassword" type="password" label="Current Password" />
              </div>
              <div class="col-12 col-sm-6">
                <AppTextField v-model="passwordForm.newPassword" type="password" label="New Password" />
              </div>
            </div>
          </AppCardText>
          <AppCardActions>
            <div class="spacer"></div>
            <AppBtn color="primary" variant="flat" :loading="savingPassword" @click="onChangePassword">
              Update Password
            </AppBtn>
          </AppCardActions>
        </AppCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth.store';
import { useSnackbar, extractErrorMessage } from '@/composables/useSnackbar';
import {
  AppCard,
  AppCardTitle,
  AppCardText,
  AppCardActions,
  AppAvatar,
  AppChip,
  AppFileInput,
  AppTextField,
  AppBtn,
} from '@/components/ui';

const authStore = useAuthStore();
const { success, error } = useSnackbar();

const apiOrigin = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

const profileForm = reactive({ fullName: '', email: '', phone: '' });
const passwordForm = reactive({ currentPassword: '', newPassword: '' });
const savingProfile = ref(false);
const savingPassword = ref(false);
const photoFile = ref<File[]>([]);

const initials = computed(() => {
  const name = authStore.user?.fullName || authStore.user?.username || 'U';
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
});

function loadFormFromStore() {
  profileForm.fullName = authStore.user?.fullName || '';
  profileForm.email = authStore.user?.email || '';
  profileForm.phone = authStore.user?.phone || '';
}

async function onSaveProfile() {
  savingProfile.value = true;
  try {
    await authStore.updateProfile({
      fullName: profileForm.fullName,
      email: profileForm.email || undefined,
      phone: profileForm.phone || undefined,
    });
    success('Profile updated successfully');
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to update profile'));
  } finally {
    savingProfile.value = false;
  }
}

async function onChangePassword() {
  if (passwordForm.newPassword.length < 6) {
    error('New password must be at least 6 characters');
    return;
  }
  savingPassword.value = true;
  try {
    await authStore.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
    success('Password changed successfully');
    passwordForm.currentPassword = '';
    passwordForm.newPassword = '';
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to change password'));
  } finally {
    savingPassword.value = false;
  }
}

async function onPhotoSelected(files: File[] | File | null) {
  const file = Array.isArray(files) ? files[0] : files;
  if (!file) return;
  try {
    await authStore.uploadPhoto(file);
    success('Profile photo updated');
  } catch (err) {
    error(extractErrorMessage(err, 'Failed to upload photo'));
  } finally {
    photoFile.value = [];
  }
}

onMounted(async () => {
  if (!authStore.user) {
    await authStore.fetchCurrentUser();
  }
  loadFormFromStore();
});
</script>

<style scoped>
.app-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
