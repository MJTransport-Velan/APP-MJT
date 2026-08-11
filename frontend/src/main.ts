import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import VueApexCharts from 'vue3-apexcharts';
import { useAuthStore } from './stores/auth.store';
import '@mdi/font/css/materialdesignicons.css';
import './styles/main.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(VueApexCharts);

// A login/logout/token-refresh in one tab updates localStorage; other open tabs
// need to pick that up instead of continuing to act on a stale access/refresh token.
window.addEventListener('storage', (event) => {
  if (!['mj_access_token', 'mj_refresh_token', 'mj_user'].includes(event.key ?? '')) return;
  const authStore = useAuthStore(pinia);
  authStore.syncFromStorage();
  if (!authStore.accessToken && router.currentRoute.value.meta.requiresAuth) {
    router.push('/login');
  }
});

app.mount('#app');
