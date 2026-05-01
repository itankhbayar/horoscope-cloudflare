<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuth } from './composables/useAuth';
import LanguageSwitcher from './components/LanguageSwitcher.vue';
import { authService } from './lib';

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
  const hasToken = await authService.isAuthenticated();
  if (!hasToken && route.meta.requiresAuth) {
    await router.replace({ name: 'login' });
  }
});

const navLinks = computed(() => [
  { to: '/', label: t('nav.home'), icon: '✨' },
  { to: '/profile', label: t('nav.profile'), icon: '☽' },
  { to: '/compatibility', label: t('nav.compatibility'), icon: '❤' },
  { to: '/tarot', label: t('nav.tarot'), icon: '🃏' },
  { to: '/premium', label: t('nav.premium'), icon: '✦' },
]);

const firstName = computed(() => user.value?.fullName?.split(' ')[0] ?? '');

watch(
  () => route.path,
  () => { /* navigation does not need extra work; transitions handle it */ },
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
      <router-link to="/" class="nav-brand">
        <span class="brand-icon">✦</span>
        <span class="brand-text">{{ t('app.name') }}</span>
      </router-link>

      <div class="nav-center">
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
        <LanguageSwitcher />
        <span class="nav-user">
          <span class="user-icon">☽</span>
          {{ firstName }}
        </span>
        <button @click="handleLogout" class="logout-btn">{{ t('nav.signOut') }}</button>
      </div>
    </nav>

    <nav v-else class="navbar guest-navbar">
      <router-link to="/login" class="nav-brand">
        <span class="brand-icon">✦</span>
        <span class="brand-text">{{ t('app.name') }}</span>
      </router-link>
      <div class="nav-right">
        <LanguageSwitcher />
      </div>
    </nav>

    <main class="page-content">
      <div v-if="!authInitialized" class="auth-boot">
        <p class="auth-boot-text">{{ t('app.loading') }}</p>
      </div>
      <router-view v-else />
    </main>
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
  z-index: 1;
  flex: 1;
  width: 100%;
  min-height: calc(100vh - 5.5rem);
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
  position: relative;
  z-index: 10;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 1rem 2rem;
  background: rgba(10, 10, 26, 0.7);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border-bottom: 1px solid var(--glass-border);
  gap: 1rem;
}
.guest-navbar {
  grid-template-columns: 1fr 1fr;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: var(--gold);
  font-family: var(--font-display);
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: 1px;
}
.brand-icon {
  font-size: 1.2rem;
  animation: twinkle 3s ease-in-out infinite alternate;
  --max-opacity: 1;
  opacity: 1;
}

.nav-center {
  display: flex;
  gap: 0.4rem;
  justify-content: center;
}
.nav-link {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  text-decoration: none;
  color: var(--text-secondary);
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 0.85rem;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
}
.nav-link:hover {
  color: var(--gold-light);
  background: rgba(255,255,255,0.03);
}
.nav-link.active {
  color: var(--gold);
  background: var(--gold-glow);
  border-color: var(--glass-border);
}
.nav-icon { font-size: 0.9rem; }

.nav-right {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  justify-content: flex-end;
}
.nav-user {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}
.user-icon { color: var(--gold-dim); font-size: 1rem; }

.logout-btn {
  padding: 0.4rem 1rem;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 0.8rem;
  transition: all 0.3s ease;
}
.logout-btn:hover {
  color: var(--error);
  border-color: rgba(255, 107, 107, 0.3);
  background: rgba(255, 107, 107, 0.05);
}

@media (max-width: 800px) {
  .navbar {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
    padding: 0.8rem 1rem;
  }
  .nav-center {
    grid-column: 1 / -1;
    grid-row: 2;
    overflow-x: auto;
    flex-wrap: nowrap;
    padding-top: 0.5rem;
  }
  .nav-label { display: none; }
  .nav-link { padding: 0.5rem 0.7rem; }
  .nav-icon { font-size: 1.1rem; }
}
</style>
