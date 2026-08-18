<template>
  <div class="login-page">
    <!-- <div class="page-topbar">
      <AppIcon icon="mdi-web" size="small" />
      <span>English</span>
      <AppIcon icon="mdi-chevron-down" size="small" />
    </div> -->

    <div class="login-grid">
      <!-- Left panel — the marketing artwork already carries the logo/headline/
           stats/features baked in, so it's shown directly at full size rather
           than reconstructed with an HTML overlay. -->
      <div class="login-left" :style="{ backgroundImage: `url(${backgroundImage})` }">
        <div class="login-left__fade"></div>
      </div>

      <!-- Right panel -->
      <div class="login-right">
        <div class="login-card">
          <div class="login-header">
            <svg class="login-logo" viewBox="0 0 140 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="mj-blue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#60a5fa" />
                  <stop offset="100%" stop-color="#1d4ed8" />
                </linearGradient>
                <linearGradient id="mj-orange" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#fb923c" />
                  <stop offset="100%" stop-color="#ea580c" />
                </linearGradient>
              </defs>
              <text x="0" y="40" font-family="Arial, sans-serif" font-weight="900" font-size="44" font-style="italic" fill="url(#mj-blue)">M</text>
              <text x="62" y="40" font-family="Arial, sans-serif" font-weight="900" font-size="44" font-style="italic" fill="url(#mj-orange)">J</text>
              <g transform="translate(4 46) rotate(-6)">
                <rect x="0" y="0" width="76" height="9" rx="2" fill="#1e293b" />
                <rect x="6" y="4" width="10" height="1.6" rx="0.8" fill="#e2e8f0" />
                <rect x="22" y="4" width="10" height="1.6" rx="0.8" fill="#e2e8f0" />
                <rect x="38" y="4" width="10" height="1.6" rx="0.8" fill="#e2e8f0" />
                <rect x="54" y="4" width="10" height="1.6" rx="0.8" fill="#e2e8f0" />
              </g>
            </svg>
            <div class="login-brand-name">MJ TRANSPORT</div>
            <div class="login-brand-tagline">FLEET &amp; LOGISTICS MANAGEMENT</div>

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
                placeholder="Enter your username"
                prepend-inner-icon="mdi-account-outline"
                autocomplete="username"
              />
            </div>

            <div class="form-group">
              <label>Password</label>
              <AppTextField
                v-model="password"
                v-bind="passwordAttrs"
                :error-messages="errors.password"
                :type="showPassword ? 'text' : 'password'"
                prepend-inner-icon="mdi-lock-outline"
                :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                placeholder="Enter your password"
                autocomplete="current-password"
                @click:append-inner="showPassword = !showPassword"
              />
            </div>

            <div class="login-options">
              <AppCheckbox v-model="remember" label="Remember Me" />
              <a class="forgot-link" href="#" @click.prevent>Forgot Password?</a>
            </div>

            <AppBtn type="submit" size="large" block :loading="loading" prepend-icon="mdi-login" class="login-btn">
              Sign In
            </AppBtn>
          </form>

          <div class="divider"><span>OR</span></div>

          <button type="button" class="secondary-btn" disabled title="Contact your administrator to get an account">
            <AppIcon icon="mdi-account-plus-outline" size="small" />
            Create New Account
          </button>

          <div class="security-badge">
            <AppIcon icon="mdi-shield-check-outline" size="small" />
            <span>256-bit SSL encrypted connection</span>
          </div>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <span>SAFE</span><span class="dot">•</span><span>SMART</span><span class="dot">•</span><span>ALWAYS ON</span>
    </div>

    <AppSnackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000">
      {{ snackbar.text }}
    </AppSnackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import { AppTextField, AppBtn, AppCheckbox, AppIcon, AppSnackbar } from "@/components/ui";
import { useForm } from "vee-validate";
import { toTypedSchema } from "@vee-validate/zod";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth.store";
import { loginSchema } from "@/utils/validators";
import { firstAccessibleModulePath } from "@/config/moduleRegistry";
import backgroundImage from "@/assets/login/LoginLeftPanel.png";

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
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #060b18;
}

.page-topbar {
  position: absolute;
  top: 24px;
  right: 32px;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #cbd5e1;
  cursor: pointer;
}

.login-grid {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: 60% 40%;
  min-height: 100vh;
}

/* ===== LEFT PANEL ===== */
.login-left {
  position: relative;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  min-height: 100%;
}

.login-left__fade {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent 78%, #060b18 100%);
}

/* ===== RIGHT PANEL ===== */
.login-right {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 32px;
  background:
    repeating-linear-gradient(135deg, transparent 0 60px, rgba(96, 165, 250, 0.035) 60px 61px),
    linear-gradient(160deg, #0a1224 0%, #060b18 100%);
}

.login-card {
  width: 100%;
  max-width: 420px;
  padding: 36px 32px;
  border-radius: 20px;
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(96, 165, 250, 0.25);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 0 0 1px rgba(96, 165, 250, 0.08), 0 24px 60px rgba(0, 0, 0, 0.5), 0 0 80px rgba(37, 99, 235, 0.12);
}

.login-header {
  text-align: center;
  margin-bottom: 24px;
}

.login-logo {
  width: 92px;
  height: 42px;
  margin: 0 auto 6px;
  display: block;
  filter: drop-shadow(0 0 14px rgba(59, 130, 246, 0.35));
}

.login-brand-name {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #f8fafc;
}

.login-brand-tagline {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: #60a5fa;
  margin-bottom: 18px;
}

.login-header h2 {
  font-size: 24px;
  font-weight: 700;
  color: #f8fafc;
  margin: 0 0 6px;
}

.login-header p {
  color: #94a3b8;
  font-size: 14px;
  margin: 0;
}

.form-group {
  margin-bottom: 18px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #cbd5e1;
  margin-bottom: 6px;
}

.form-group :deep(.app-field__control) {
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.25);
  height: 48px;
}

.form-group :deep(.app-field__control:focus-within) {
  background: rgba(255, 255, 255, 0.08);
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}

.form-group :deep(.app-field__input) {
  padding: 0 4px;
  font-size: 14px;
  color: #f1f5f9;
}

.form-group :deep(.app-field__input::placeholder) {
  color: #64748b;
}

.form-group :deep(.app-field__icon) {
  color: #64748b;
}

.form-group :deep(.app-field__control:focus-within .app-field__icon) {
  color: #60a5fa;
}

.login-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.login-options :deep(.app-checkbox__label) {
  color: #cbd5e1;
  font-size: 13px;
}

.login-options :deep(.app-checkbox__box) {
  border-color: rgba(148, 163, 184, 0.5);
  background: rgba(255, 255, 255, 0.05);
}

.login-options :deep(input:checked + .app-checkbox__box) {
  background: #3b82f6;
  border-color: #3b82f6;
}

.forgot-link {
  font-size: 13px;
  color: #f97316;
  text-decoration: none;
  font-weight: 500;
}

.forgot-link:hover {
  text-decoration: underline;
}

/* !important needed here: AppBtn's own scoped default-color rule is the
   same specificity (two classes + its own scope attribute) as this
   override, so the winner would otherwise depend on unpredictable
   stylesheet injection order. */
:deep(.login-btn.app-btn) {
  border-radius: 10px !important;
  font-weight: 600 !important;
  font-size: 15px !important;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
  color: #ffffff !important;
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.45) !important;
  border: none !important;
}

:deep(.login-btn.app-btn:hover:not(.app-btn--disabled)) {
  filter: brightness(1.08);
}

.divider {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 22px 0;
  color: #64748b;
  font-size: 12px;
  letter-spacing: 0.08em;
}

.divider::before,
.divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: rgba(148, 163, 184, 0.2);
}

/* Disabled on purpose — there is no self-registration flow in this system
   (an admin creates accounts), so this stays a visible-but-inert affordance
   rather than a button that goes nowhere. */
.secondary-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  font-size: 14px;
  font-weight: 500;
  color: #e2e8f0;
  cursor: not-allowed;
  opacity: 0.55;
}

.security-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 24px;
  font-size: 12px;
  color: #64748b;
}

.page-footer {
  padding: 14px 0 18px;
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  color: #475569;
  background: #060b18;
}

.page-footer .dot {
  margin: 0 10px;
  color: #334155;
  letter-spacing: 0;
}

/* ===== RESPONSIVE ===== */
@media (max-width: 900px) {
  .login-grid {
    grid-template-columns: 1fr;
  }
  .login-left {
    display: none;
  }
  .page-topbar {
    top: 16px;
    right: 16px;
  }
}

@media (max-width: 480px) {
  .login-right {
    padding: 24px 16px;
  }
  .login-card {
    padding: 30px 22px;
  }
  .login-header h2 {
    font-size: 21px;
  }
}
</style>
