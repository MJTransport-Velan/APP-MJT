<template>
  <div class="login-page">
    <!-- Left Panel - Branding & Stats with Background Image -->
    <div class="login-left" :style="{ backgroundImage: `url(${backgroundImage})` }">
      <!-- <div class="left-overlay">
        <div class="brand-section">
          <div class="logo">
            <span class="logo-icon">MJ</span>
            <span class="logo-text">TRANSPORT</span>
          </div>
          <h1 class="brand-headline">Smart Logistics for<br />Modern Enterprise</h1>
          <p class="brand-description">
            Real-time tracking, optimized routes, and<br />
            seamless logistics management for your business.
          </p>
        </div>

        <div class="stats-section">
          <div class="stat-item">
            <span class="stat-number">15K+</span>
            <span class="stat-label">Monthly Trips</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-number">99.8%</span>
            <span class="stat-label">On-Time Delivery</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-number">500+</span>
            <span class="stat-label">Fleet Vehicles</span>
          </div>
        </div>

        <div class="features-section">
          <div class="feature-item">
            <span class="feature-icon">●</span>
            <div>
              <span class="feature-title">Real-time Tracking</span>
              <span class="feature-desc">Live location & status</span>
            </div>
          </div>
          <div class="feature-item">
            <span class="feature-icon">●</span>
            <div>
              <span class="feature-title">Route Optimization</span>
              <span class="feature-desc">AI-powered efficiency</span>
            </div>
          </div>
          <div class="feature-item">
            <span class="feature-icon">●</span>
            <div>
              <span class="feature-title">Secure & Reliable</span>
              <span class="feature-desc">Enterprise-grade security</span>
            </div>
          </div>
          <div class="feature-item">
            <span class="feature-icon">●</span>
            <div>
              <span class="feature-title">24/7 Support</span>
              <span class="feature-desc">We're always here</span>
            </div>
          </div>
        </div>
      </div> -->
    </div>

    <!-- Right Panel - Login Form -->
    <div class="login-right">
      <div class="login-card">
        <!-- Language Selector -->
        <div class="language-selector">
          <span>English</span>
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
            <path
              d="M1 1.5L6 6.5L11 1.5"
              stroke="#64748B"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </div>

        <div class="login-header">
          <div class="header-icon">MJ</div>
          <h2>Welcome Back</h2>
          <p>Sign in to continue to your account</p>
        </div>

        <form @submit.prevent="onSubmit">
          <div class="form-group">
            <label>User Name</label>
            <AppTextField
              v-model="username"
              v-bind="usernameAttrs"
              :error-messages="errors.username"
              placeholder="UserName"
            />
          </div>

          <div class="form-group">
            <label>Password</label>
            <AppTextField
              v-model="password"
              v-bind="passwordAttrs"
              :error-messages="errors.password"
              :type="showPassword ? 'text' : 'password'"
              :append-inner-icon="
                showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'
              "
              placeholder="password"
              @click:append-inner="showPassword = !showPassword"
            />
          </div>

          <div class="login-options">
            <label class="checkbox-label">
              <input type="checkbox" v-model="remember" />
              <span>Remember Me</span>
            </label>
            <a class="forgot-link" href="#" @click.prevent>Forgot Password?</a>
          </div>

          <AppBtn
            type="submit"
            color="#f97316"
            size="large"
            block
            :loading="loading"
            class="login-btn"
          >
            Sign In
          </AppBtn>
        </form>

        <!-- <div class="divider">
          <span>or continue with</span>
        </div>

        <div class="social-buttons">
          <button class="social-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Google
          </button>
          <button class="social-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M11.99 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.15 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.62.24 2.85.12 3.15.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"
                fill="#333"
              />
            </svg>
            Microsoft
          </button>
        </div> -->

        <div class="security-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L3 6v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V6l-9-4z"
              stroke="#64748B"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>256-bit SSL encrypted connection</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import { AppTextField, AppBtn } from "@/components/ui";
import { useForm } from "vee-validate";
import { toTypedSchema } from "@vee-validate/zod";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth.store";
import { loginSchema } from "@/utils/validators";
import { firstAccessibleModulePath } from "@/config/moduleRegistry";
import backgroundImage from "@/assets/login/LoginLeftPanel.png"; // Update path as needed

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const loading = ref(false);
const showPassword = ref(false);

const snackbar = reactive({
  show: false,
  text: "",
  color: "error",
});

const { defineField, handleSubmit, errors } = useForm({
  validationSchema: toTypedSchema(loginSchema),
  initialValues: { username: "", password: "", remember: false },
});

const [username, usernameAttrs] = defineField("username");
const [password, passwordAttrs] = defineField("password");
const remember = ref(false);

const onSubmit = handleSubmit(async (values) => {
  loading.value = true;
  try {
    await authStore.login(values.username, values.password);
    const redirect = (route.query.redirect as string) || firstAccessibleModulePath(authStore.hasPermission);
    router.push(redirect);
  } catch (err: any) {
    snackbar.text =
      err?.response?.data?.message || "Login failed. Please check your credentials.";
    snackbar.color = "error";
    snackbar.show = true;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 60% 40%;
  background: #ffffff;
}

/* ===== LEFT PANEL WITH BACKGROUND IMAGE ===== */
.login-left {
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  position: relative;
  min-height: 100vh;
}

.left-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(10, 22, 40, 0.88) 0%,
    rgba(10, 22, 40, 0.75) 50%,
    rgba(10, 22, 40, 0.88) 100%
  );
  padding: 60px 48px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.brand-section {
  position: relative;
  z-index: 1;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 48px;
}

.logo-icon {
  background: #f97316;
  color: #ffffff;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
}

.logo-text {
  font-weight: 700;
  font-size: 18px;
  letter-spacing: 2px;
  color: #ffffff;
}

.brand-headline {
  font-size: 36px;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 16px;
  color: #ffffff;
}

.brand-description {
  color: rgba(255, 255, 255, 0.7);
  font-size: 15px;
  line-height: 1.6;
}

.stats-section {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 32px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
  z-index: 1;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
  color: #ffffff;
}

.stat-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 2px;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: rgba(255, 255, 255, 0.12);
}

.features-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 24px;
  position: relative;
  z-index: 1;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.feature-icon {
  color: #f97316;
  font-size: 10px;
  margin-top: 4px;
}

.feature-title {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
}

.feature-desc {
  display: block;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

/* ===== RIGHT PANEL ===== */
.login-right {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: #ffffff;
}

.login-card {
  width: 100%;
  max-width: 400px;
}

.language-selector {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  font-size: 13px;
  color: #64748b;
  cursor: pointer;
  margin-bottom: 32px;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.header-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 16px;
  border-radius: 12px;
  background: #f97316;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 18px;
}

.login-header h2 {
  font-size: 24px;
  font-weight: 700;
  color: #0a1628;
  margin: 0 0 6px;
}

.login-header p {
  color: #64748b;
  font-size: 14px;
  margin: 0;
}

.form-group {
  margin-bottom: 18px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}

.form-group :deep(.app-field__control) {
  border-radius: 8px;
  background: #f8fafc;
}

.form-group :deep(.app-field__input) {
  padding: 12px 14px;
  font-size: 14px;
}

.form-group :deep(.app-field__control:focus-within) {
  background: #ffffff;
}

.login-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #475569;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #f97316;
  cursor: pointer;
}

.forgot-link {
  font-size: 13px;
  color: #f97316;
  text-decoration: none;
  font-weight: 500;
}

.login-btn {
  background: #f97316 !important;
  color: #ffffff !important;
  border-radius: 8px !important;
  text-transform: none !important;
  font-weight: 600 !important;
  font-size: 15px !important;
  padding: 12px !important;
  transition: background 0.2s !important;
}

.login-btn:hover {
  background: #ea580c !important;
}

.divider {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 24px 0;
  color: #94a3b8;
  font-size: 13px;
}

.divider::before,
.divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: #e2e8f0;
}

.social-buttons {
  display: flex;
  gap: 12px;
}

.social-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}

.social-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.security-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 28px;
  font-size: 12px;
  color: #94a3b8;
}

.security-badge svg {
  color: #64748b;
}

/* ===== RESPONSIVE ===== */
@media (max-width: 1024px) {
  .left-overlay {
    padding: 40px 32px;
  }
  .brand-headline {
    font-size: 28px;
  }
}

/* Add these styles to hide left panel on mobile */

@media (max-width: 768px) {
  .login-left {
    display: none;
  }
  
  .login-page {
    grid-template-columns: 1fr;
  }

  .left-overlay {
    padding: 32px 24px;
    min-height: 50vh;
  }

  .brand-headline {
    font-size: 24px;
  }

  .stats-section {
    padding: 20px 0;
    flex-wrap: wrap;
    gap: 12px;
  }

  .stat-divider {
    display: none;
  }

  .stat-number {
    font-size: 22px;
  }

  .features-section {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .login-right {
    padding: 24px 16px;
  }

  .login-card {
    max-width: 100%;
  }

  .login-header h2 {
    font-size: 20px;
  }

  .social-buttons {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .login-left {
    min-height: 40vh;
  }

  .left-overlay {
    padding: 24px 16px;
    min-height: 40vh;
  }

  .brand-headline {
    font-size: 20px;
  }

  .brand-description {
    font-size: 13px;
  }

  .features-section {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .stats-section {
    gap: 8px;
  }

  .stat-number {
    font-size: 18px;
  }

  .login-card {
    padding: 0;
  }

  .login-options {
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>
