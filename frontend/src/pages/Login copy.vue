<template>
  <div class="login-page">
    <AppCard class="login-card" elevation="8">
      <div class="login-brand">
        <div class="logo-circle">MJ</div>
        <h1 class="brand-title">MJ Transport</h1>
        <p class="brand-subtitle">Transport ERP</p>
      </div>

      <form @submit.prevent="onSubmit">
        <AppTextField
          v-model="username"
          v-bind="usernameAttrs"
          :error-messages="errors.username"
          label="Username"
          prepend-inner-icon="mdi-account-outline"
          autocomplete="username"
        />

        <AppTextField
          v-model="password"
          v-bind="passwordAttrs"
          :error-messages="errors.password"
          :type="showPassword ? 'text' : 'password'"
          :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
          label="Password"
          prepend-inner-icon="mdi-lock-outline"
          autocomplete="current-password"
          @click:append-inner="showPassword = !showPassword"
        />

        <div class="login-options">
          <AppCheckbox v-model="remember" label="Remember Me" />
          <a class="forgot-link" href="#" @click.prevent>Forgot Password?</a>
        </div>

        <AppBtn
          type="submit"
          color="primary"
          size="large"
          block
          :loading="loading"
        >
          Login
        </AppBtn>
      </form>
    </AppCard>

    <AppSnackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000">
      {{ snackbar.text }}
    </AppSnackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { AppCard, AppTextField, AppCheckbox, AppBtn, AppSnackbar } from '@/components/ui';
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { loginSchema } from '@/utils/validators';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const loading = ref(false);
const showPassword = ref(false);

const snackbar = reactive({
  show: false,
  text: '',
  color: 'error',
});

const { defineField, handleSubmit, errors } = useForm({
  validationSchema: toTypedSchema(loginSchema),
  initialValues: { username: '', password: '', remember: false },
});

const [username, usernameAttrs] = defineField('username');
const [password, passwordAttrs] = defineField('password');
const remember = ref(false);

const onSubmit = handleSubmit(async (values) => {
  loading.value = true;
  try {
    await authStore.login(values.username, values.password);
    const redirect = (route.query.redirect as string) || '/dashboard';
    router.push(redirect);
  } catch (err: any) {
    snackbar.text = err?.response?.data?.message || 'Login failed. Please check your credentials.';
    snackbar.color = 'error';
    snackbar.show = true;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #1e3a8a 100%);
  padding: 24px;
}

.login-card {
  width: 100%;
  max-width: 420px;
  padding: 40px 32px;
  border-radius: 16px;
}

.login-brand {
  text-align: center;
  margin-bottom: 32px;
}

.logo-circle {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border-radius: 50%;
  background: #1e3a8a;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 22px;
}

.brand-title {
  font-size: 24px;
  font-weight: 700;
  color: #1e3a8a;
  margin: 0;
}

.brand-subtitle {
  color: #64748b;
  margin-top: 4px;
  font-size: 14px;
}

.login-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.forgot-link {
  color: #f97316;
  font-size: 13px;
  text-decoration: none;
}

@media (max-width: 480px) {
  .login-card {
    padding: 28px 20px;
  }
}
</style>
