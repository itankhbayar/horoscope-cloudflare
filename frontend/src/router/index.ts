import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const pages = {
  LandingPage: () => import('../pages/LandingPage.vue'),
  HomePage: () => import('../pages/HomePage.vue'),
  LoginPage: () => import('../pages/LoginPage.vue'),
  RegisterPage: () => import('../pages/RegisterPage.vue'),
  ProfilePage: () => import('../pages/ProfilePage.vue'),
  ChartPage: () => import('../pages/ChartPage.vue'),
  CompatibilityPage: () => import('../pages/CompatibilityPage.vue'),
  CompatibilityStaticPage: () => import('../pages/CompatibilityStaticPage.vue'),
  TarotPage: () => import('../pages/TarotPage.vue'),
  PremiumPage: () => import('../pages/PremiumPage.vue'),
  PremiumSuccessPage: () => import('../pages/PremiumSuccessPage.vue'),
  PremiumCancelPage: () => import('../pages/PremiumCancelPage.vue'),
  HoroscopeSignPage: () => import('../pages/HoroscopeSignPage.vue'),
  PrivacyPage: () => import('../pages/PrivacyPage.vue'),
  TermsPage: () => import('../pages/TermsPage.vue'),
  DeleteAccountPage: () => import('../pages/DeleteAccountPage.vue'),
} satisfies Record<string, () => Promise<unknown>>;

function runWhenIdle(task: () => void): void {
  if (typeof globalThis.window === 'undefined') return;
  const browserWindow = globalThis.window;
  if ('requestIdleCallback' in browserWindow) {
    browserWindow.requestIdleCallback(task, { timeout: 3_000 });
    return;
  }
  globalThis.setTimeout(task, 1_000);
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'landing', component: pages.LandingPage, meta: { seoCritical: true } },
    { path: '/today', name: 'home', component: pages.HomePage, meta: { requiresAuth: true } },
    { path: '/chart', name: 'chart', component: pages.ChartPage, meta: { requiresAuth: true } },
    { path: '/profile', name: 'profile', component: pages.ProfilePage, meta: { requiresAuth: true } },
    { path: '/compatibility', name: 'compatibility', component: pages.CompatibilityPage, meta: { requiresAuth: true } },
    { path: '/tarot', name: 'tarot', component: pages.TarotPage, meta: { requiresAuth: true } },
    { path: '/premium', name: 'premium', component: pages.PremiumPage, meta: { requiresAuth: true } },
    {
      path: '/premium/success',
      name: 'premium-success',
      component: pages.PremiumSuccessPage,
      meta: { requiresAuth: true },
    },
    {
      path: '/premium/cancel',
      name: 'premium-cancel',
      component: pages.PremiumCancelPage,
      meta: { requiresAuth: true },
    },
    { path: '/login', name: 'login', component: pages.LoginPage, meta: { guest: true } },
    { path: '/register', name: 'register', component: pages.RegisterPage, meta: { guest: true } },
    { path: '/horoscope/:sign', name: 'horoscope-sign', component: pages.HoroscopeSignPage, meta: { seoCritical: true } },
    { path: '/horoscope/:sign/today', name: 'horoscope-sign-today', component: pages.HoroscopeSignPage, meta: { seoCritical: true } },
    { path: '/compatibility/:sign1/:sign2', name: 'compatibility-static', component: pages.CompatibilityStaticPage, meta: { seoCritical: true } },
    { path: '/privacy', name: 'privacy', component: pages.PrivacyPage, meta: { seoCritical: true } },
    { path: '/terms', name: 'terms', component: pages.TermsPage, meta: { seoCritical: true } },
    { path: '/delete-account', name: 'delete-account', component: pages.DeleteAccountPage, meta: { seoCritical: true } },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (!auth.initialized) await auth.bootstrap();
  if (to.meta.requiresAuth && !auth.isAuthenticated) return { name: 'login' };
  if (to.meta.guest && auth.isAuthenticated) {
    const validSession = await auth.validateGuestSession();
    if (validSession) return { name: 'home' };
  }
  return true;
});

router.afterEach((to) => {
  runWhenIdle(() => {
    if (to.meta.guest || to.name === 'landing') void pages.HomePage();
    if (to.name === 'home') {
      void pages.CompatibilityPage();
      void pages.TarotPage();
      void pages.PremiumPage();
    }
  });
});

export default router;
