import { createRouter, createWebHistory } from 'vue-router';
import LoginPage from '../pages/LoginPage.vue';
import RegisterPage from '../pages/RegisterPage.vue';
import HomePage from '../pages/HomePage.vue';
import ProfilePage from '../pages/ProfilePage.vue';
import ChartPage from '../pages/ChartPage.vue';
import CompatibilityPage from '../pages/CompatibilityPage.vue';
import PremiumPage from '../pages/PremiumPage.vue';
import PremiumSuccessPage from '../pages/PremiumSuccessPage.vue';
import PremiumCancelPage from '../pages/PremiumCancelPage.vue';
import TarotPage from '../pages/TarotPage.vue';
import PrivacyPage from '../pages/PrivacyPage.vue';
import TermsPage from '../pages/TermsPage.vue';
import DeleteAccountPage from '../pages/DeleteAccountPage.vue';
import { authService } from '../lib';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomePage, meta: { requiresAuth: true } },
    { path: '/chart', name: 'chart', component: ChartPage, meta: { requiresAuth: true } },
    { path: '/profile', name: 'profile', component: ProfilePage, meta: { requiresAuth: true } },
    { path: '/compatibility', name: 'compatibility', component: CompatibilityPage, meta: { requiresAuth: true } },
    { path: '/tarot', name: 'tarot', component: TarotPage, meta: { requiresAuth: true } },
    { path: '/premium', name: 'premium', component: PremiumPage, meta: { requiresAuth: true } },
    {
      path: '/premium/success',
      name: 'premium-success',
      component: PremiumSuccessPage,
      meta: { requiresAuth: true },
    },
    {
      path: '/premium/cancel',
      name: 'premium-cancel',
      component: PremiumCancelPage,
      meta: { requiresAuth: true },
    },
    { path: '/login', name: 'login', component: LoginPage, meta: { guest: true } },
    { path: '/register', name: 'register', component: RegisterPage, meta: { guest: true } },
    { path: '/privacy', name: 'privacy', component: PrivacyPage },
    { path: '/terms', name: 'terms', component: TermsPage },
    { path: '/delete-account', name: 'delete-account', component: DeleteAccountPage },
  ],
});

router.beforeEach(async (to) => {
  const hasToken = await authService.isAuthenticated();
  if (to.meta.requiresAuth && !hasToken) return { name: 'login' };
  if (to.meta.guest && hasToken) {
    try {
      await Promise.race([
        authService.fetchMe(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('auth-check-timeout')), 4000);
        }),
      ]);
      return { name: 'home' };
    } catch {
      await authService.clearLocalSession();
    }
  }
  return true;
});

export default router;
