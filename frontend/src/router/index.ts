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
    // Home (the daily reading) is the entry point for everyone — guests and signed-in
    // users alike. The marketing landing lives at /welcome for campaigns/SEO.
    { path: '/', redirect: '/today' },
    { path: '/welcome', name: 'landing', component: pages.LandingPage, meta: { seoCritical: true } },
    { path: '/today', name: 'home', component: pages.HomePage, meta: { guestAllowed: true } },
    // Guests may browse these features and fill in the inputs; the result itself is
    // gated in-page (GuestResultGate) so they discover the value before signing up.
    { path: '/chart', name: 'chart', component: pages.ChartPage, meta: { guestAllowed: true } },
    { path: '/profile', name: 'profile', component: pages.ProfilePage, meta: { requiresAuth: true } },
    { path: '/compatibility', name: 'compatibility', component: pages.CompatibilityPage, meta: { guestAllowed: true } },
    { path: '/tarot', name: 'tarot', component: pages.TarotPage, meta: { guestAllowed: true } },
    { path: '/premium', name: 'premium', component: pages.PremiumPage, meta: { guestAllowed: true } },
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
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    // Remember where the guest was headed so login/register can return them
    // to the feature they tapped instead of dropping them on the daily reading.
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (to.meta.guest && auth.isAuthenticated) {
    const validSession = await auth.validateGuestSession();
    if (validSession) return { name: 'home' };
  }
  // Logged-in users hitting the public marketing landing belong on their daily reading,
  // not the acquisition pitch. Validate first so a stale token can't cause a redirect loop.
  if (to.name === 'landing' && auth.isAuthenticated) {
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
