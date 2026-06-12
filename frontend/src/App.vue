<script setup lang="ts">
import { defineAsyncComponent, onMounted, ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuth } from './composables/useAuth';

const LanguageSwitcher = defineAsyncComponent(() => import('./components/LanguageSwitcher.vue'));
const SiteFooter = defineAsyncComponent(() => import('./components/SiteFooter.vue'));
const PrivacyConsentBanner = defineAsyncComponent(
  () => import('./components/PrivacyConsentBanner.vue'),
);

const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const {
  user,
  isAuthenticated,
  bootstrap,
  logout,
  initialized: authInitialized,
} = useAuth();

interface Star { id: number; left: string; top: string; width: string; height: string; duration: string; delay: string; maxOpacity: number }
const stars = ref<Star[]>([]);

function generateStars(): void {
  const arr: Star[] = [];
  for (let i = 0; i < 140; i++) {
    const size = Math.random() * 2.4 + 0.5;
    arr.push({
      id: i,
      left: Math.random() * 100 + '%',
      top: Math.random() * 100 + '%',
      width: size + 'px',
      height: size + 'px',
      duration: (Math.random() * 4 + 2) + 's',
      delay: (Math.random() * 5) + 's',
      maxOpacity: Math.random() * 0.6 + 0.2,
    });
  }
  stars.value = arr;
}

async function handleLogout(): Promise<void> {
  await logout();
  router.push('/login');
}

onMounted(async () => {
  generateStars();
  await bootstrap();
  if (!isAuthenticated.value && route.meta.requiresAuth) {
    await router.replace({ name: 'login' });
  }
});

const navLinks = computed(() => [
  { to: '/', label: t('nav.home'), icon: '✨' },
  { to: '/compatibility', label: t('nav.compatibility'), icon: '❤' },
  { to: '/tarot', label: t('nav.tarot'), icon: '🃏' },
  { to: '/chart', label: 'Chart', icon: '◎' },
  { to: '/premium', label: t('nav.premium'), icon: '✦' },
  { to: '/profile', label: t('nav.profile'), icon: '☽' },
].map((link) => (link.to === '/' ? { ...link, to: '/today' } : link)));

const firstName = computed(() => user.value?.fullName?.split(' ')[0] ?? '');
const isGuestRoute = computed(() => Boolean(route.meta.guest));
const mobileMenuOpen = ref(false);

function toggleMobileMenu(): void {
  mobileMenuOpen.value = !mobileMenuOpen.value;
}

watch(
  () => route.path,
  () => {
    mobileMenuOpen.value = false;
  },
);
</script>

<template>
  <div class="app-shell">
    <div class="starfield">
      <div v-for="s in stars" :key="s.id" class="star" :style="{
        left: s.left, top: s.top, width: s.width, height: s.height,
        '--duration': s.duration, '--max-opacity': s.maxOpacity, animationDelay: s.delay,
      }" />
    </div>

    <nav v-if="!authInitialized" class="navbar guest-navbar boot-nav">
      <span class="nav-brand boot-brand">
        <span class="brand-icon">✦</span>
        <span class="brand-text">{{ t('app.name') }}</span>
      </span>
      <div class="nav-right" />
    </nav>

    <nav v-else-if="isAuthenticated" class="navbar">
      <router-link to="/today" class="nav-brand">
        <span class="brand-orb" aria-hidden="true">✦</span>
        <span class="brand-text">{{ t('app.name') }}</span>
      </router-link>

      <div class="nav-center desktop-nav">
        <router-link
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="nav-link"
          :class="{ active: route.path === link.to }"
        >
          <span class="nav-icon">{{ link.icon }}</span>
          <span class="nav-label">{{ link.label }}</span>
        </router-link>
      </div>

      <div class="nav-right">
        <div class="nav-desktop-actions">
          <LanguageSwitcher />
          <span class="nav-user">
            <span class="user-icon">☽</span>
            {{ firstName }}
          </span>
          <button @click="handleLogout" class="logout-btn">{{ t('nav.signOut') }}</button>
        </div>

        <button class="menu-btn" :aria-expanded="mobileMenuOpen" @click="toggleMobileMenu">
          <span />
          <span />
          <span />
        </button>
      </div>

      <div v-if="mobileMenuOpen" class="mobile-menu">
        <div class="mobile-nav-links">
          <router-link
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="mobile-nav-link"
            :class="{ active: route.path === link.to }"
          >
            <span>{{ link.icon }}</span>
            {{ link.label }}
          </router-link>
        </div>

        <div class="mobile-menu-actions">
          <LanguageSwitcher />
          <span class="mobile-user">
            <span class="user-icon">☽</span>
            {{ firstName }}
          </span>
          <button @click="handleLogout" class="logout-btn mobile-logout">
            {{ t('nav.signOut') }}
          </button>
        </div>
      </div>
    </nav>

    <nav v-else class="navbar guest-navbar">
      <router-link to="/" class="nav-brand">
        <span class="brand-icon">✦</span>
        <span class="brand-text">{{ t('app.name') }}</span>
      </router-link>
      <div class="nav-right">
        <LanguageSwitcher />
        <router-link to="/login" class="guest-link">{{ t('auth.signIn') }}</router-link>
        <router-link to="/register" class="guest-cta">{{ t('landing.ctaPrimary') }}</router-link>
      </div>
    </nav>

    <main class="page-content" :class="{ 'page-content--guest': isGuestRoute }">
      <div v-if="!authInitialized" class="auth-boot">
        <p class="auth-boot-text">{{ t('app.loading') }}</p>
      </div>
      <router-view v-else v-slot="{ Component }">
        <Suspense>
          <div class="route-view">
            <component :is="Component" />
          </div>
          <template #fallback>
            <div class="auth-boot">
              <p class="auth-boot-text">{{ t('app.loading') }}</p>
            </div>
          </template>
        </Suspense>
      </router-view>
    </main>
    <SiteFooter v-if="authInitialized && !isGuestRoute" />
    <PrivacyConsentBanner />
  </div>
</template>

<style scoped>
.app-shell {
  position: relative;
  min-height: 100vh;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.page-content {
  position: relative;
  z-index: 5;
  flex: 1;
  width: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.page-content--guest {
  min-height: 0;
  flex: none;
}
.route-view {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.auth-boot {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 0.9rem;
  letter-spacing: 0.5px;
}
.auth-boot-text {
  margin: 0;
}
.boot-nav .boot-brand {
  pointer-events: none;
  color: var(--text-muted);
}

.navbar {
  position: sticky;
  top: 0;
  z-index: 50;
  width: min(1280px, calc(100% - 1.5rem));
  margin: 0.75rem auto 0;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 1rem;
  padding: 0.65rem;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(18, 17, 42, 0.82), rgba(8, 8, 24, 0.78));
  box-shadow:
    0 18px 50px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.guest-navbar {
  grid-template-columns: 1fr auto;
}

.nav-brand {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  color: var(--gold);
  text-decoration: none;
}

.brand-orb,
.brand-icon {
  display: inline-grid;
  width: 2.15rem;
  height: 2.15rem;
  place-items: center;
  border-radius: 999px;
  border: 1px solid rgba(212, 175, 55, 0.3);
  background: rgba(212, 175, 55, 0.09);
  box-shadow: 0 0 26px rgba(212, 175, 55, 0.13);
  font-size: 0.95rem;
}

.brand-text {
  font-family: var(--font-display);
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 0.7px;
  white-space: nowrap;
}

.nav-center {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.22rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  min-height: 2.25rem;
  padding: 0 0.78rem;
  border-radius: 999px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.82rem;
  letter-spacing: 0.25px;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;
}

.nav-link:hover {
  color: var(--gold-light);
  background: rgba(212, 175, 55, 0.07);
}

.nav-link.active {
  color: #151326;
  background: linear-gradient(135deg, var(--gold), var(--gold-light));
  box-shadow: 0 8px 24px rgba(212, 175, 55, 0.18);
}

.nav-icon {
  font-size: 0.92rem;
}

.nav-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.65rem;
}

.nav-desktop-actions {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.nav-user {
  max-width: 14rem;
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  color: var(--text-secondary);
  font-size: 0.84rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-icon {
  color: var(--gold-dim);
}

.logout-btn {
  min-height: 2.25rem;
  padding: 0 0.78rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.035);
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 0.8rem;
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease;
}

.logout-btn:hover {
  color: var(--error);
  border-color: rgba(255, 107, 107, 0.32);
  background: rgba(255, 107, 107, 0.07);
}

.guest-link,
.guest-cta {
  min-height: 2.35rem;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0 0.9rem;
  text-decoration: none;
  font-size: 0.84rem;
  font-weight: 700;
  white-space: nowrap;
}

.guest-link {
  color: var(--text-secondary);
}

.guest-link:hover {
  color: var(--gold-light);
}

.guest-cta {
  color: #151326;
  background: linear-gradient(135deg, var(--gold), var(--gold-light));
  box-shadow: 0 10px 26px rgba(212, 175, 55, 0.18);
}

.menu-btn {
  display: none;
  width: 2.55rem;
  height: 2.55rem;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  cursor: pointer;
}

.menu-btn span {
  display: block;
  width: 1rem;
  height: 2px;
  margin: 2px 0;
  border-radius: 999px;
  background: var(--text-secondary);
}

.mobile-menu {
  grid-column: 1 / -1;
  margin-top: 0.45rem;
  padding: 0.65rem;
  border-radius: 1.35rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(8, 8, 24, 0.9);
}

.mobile-nav-links {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.45rem;
}

.mobile-nav-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.7rem;
  padding: 0 0.8rem;
  border-radius: 0.95rem;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.035);
  text-decoration: none;
  font-size: 0.86rem;
}

.mobile-nav-link.active {
  color: #151326;
  background: linear-gradient(135deg, var(--gold), var(--gold-light));
}

.mobile-menu-actions {
  margin-top: 0.65rem;
  padding-top: 0.65rem;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.mobile-user {
  margin-left: auto;
  color: var(--text-secondary);
  font-size: 0.82rem;
}

.nav-brand:focus-visible,
.nav-link:focus-visible,
.guest-link:focus-visible,
.guest-cta:focus-visible,
.logout-btn:focus-visible,
.menu-btn:focus-visible,
.mobile-nav-link:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 3px;
}

@media (max-width: 980px) {
  .nav-label {
    display: none;
  }

  .nav-link {
    padding: 0 0.68rem;
  }
}

@media (max-width: 800px) {
  .navbar {
    width: min(100% - 1rem, 1180px);
    grid-template-columns: 1fr auto;
    border-radius: 1.35rem;
    margin-top: 0.5rem;
  }

  .desktop-nav,
  .nav-desktop-actions {
    display: none;
  }

  .menu-btn {
    display: inline-grid;
  }

  .brand-text {
    max-width: 11rem;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

@media (max-width: 420px) {
  .mobile-nav-links {
    grid-template-columns: 1fr;
  }

  .brand-text {
    font-size: 1.08rem;
    max-width: 9rem;
  }
}
</style>
