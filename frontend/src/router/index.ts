import { createRouter, createWebHistory } from 'vue-router';
import LoginPage from '../pages/LoginPage.vue';
import RegisterPage from '../pages/RegisterPage.vue';
import HomePage from '../pages/HomePage.vue';
import ProfilePage from '../pages/ProfilePage.vue';
import CompatibilityPage from '../pages/CompatibilityPage.vue';
import PremiumPage from '../pages/PremiumPage.vue';
import TarotPage from '../pages/TarotPage.vue';
import { authService } from '../lib';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomePage, meta: { requiresAuth: true } },
    { path: '/profile', name: 'profile', component: ProfilePage, meta: { requiresAuth: true } },
    { path: '/compatibility', name: 'compatibility', component: CompatibilityPage, meta: { requiresAuth: true } },
    { path: '/tarot', name: 'tarot', component: TarotPage, meta: { requiresAuth: true } },
    { path: '/premium', name: 'premium', component: PremiumPage, meta: { requiresAuth: true } },
    { path: '/login', name: 'login', component: LoginPage, meta: { guest: true } },
    { path: '/register', name: 'register', component: RegisterPage, meta: { guest: true } },
  ],
});

router.beforeEach(async (to) => {
  const authed = await authService.isAuthenticated();
  if (to.meta.requiresAuth && !authed) return { name: 'login' };
  if (to.meta.guest && authed) return { name: 'home' };
  return true;
});

export default router;
