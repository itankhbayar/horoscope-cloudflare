<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuth } from '../composables/useAuth';

const { t } = useI18n();
const { isAuthenticated } = useAuth();

const navLinks = computed(() =>
  isAuthenticated.value
    ? [
        { to: '/', label: t('nav.home') },
        { to: '/profile', label: t('nav.profile') },
        { to: '/compatibility', label: t('nav.compatibility') },
        { to: '/tarot', label: t('nav.tarot') },
        { to: '/premium', label: t('nav.premium') },
      ]
    : [
        { to: '/login', label: t('auth.signIn') },
        { to: '/register', label: t('auth.createAccount') },
      ],
);

const legalLinks = computed(() => [
  { href: 'https://example.com/terms', label: t('footer.terms') },
  { href: 'https://example.com/privacy', label: t('footer.privacy') },
]);

const socialLinks = computed(() => [
  { href: 'https://x.com', label: t('footer.socialX') },
  { href: 'https://instagram.com', label: t('footer.socialInstagram') },
  { href: 'https://youtube.com', label: t('footer.socialYoutube') },
]);

const year = new Date().getFullYear();
</script>

<template>
  <footer class="site-footer" role="contentinfo">
    <div class="footer-container">
      <section class="footer-group brand-group" aria-labelledby="footer-brand-heading">
        <h2 id="footer-brand-heading" class="footer-brand">
          <span class="brand-icon" aria-hidden="true">✦</span>
          <span>{{ t('app.name') }}</span>
        </h2>
        <p class="brand-copy">{{ t('footer.brandTagline') }}</p>
      </section>

      <nav class="footer-group" aria-labelledby="footer-nav-heading">
        <h3 id="footer-nav-heading" class="footer-heading">{{ t('footer.navigation') }}</h3>
        <ul class="footer-links">
          <li v-for="item in navLinks" :key="item.to">
            <router-link :to="item.to" class="footer-link">{{ item.label }}</router-link>
          </li>
        </ul>
      </nav>

      <nav class="footer-group" aria-labelledby="footer-legal-heading">
        <h3 id="footer-legal-heading" class="footer-heading">{{ t('footer.legal') }}</h3>
        <ul class="footer-links">
          <li v-for="item in legalLinks" :key="item.href">
            <a class="footer-link" :href="item.href" target="_blank" rel="noopener noreferrer">
              {{ item.label }}
            </a>
          </li>
        </ul>
      </nav>

      <nav class="footer-group" aria-labelledby="footer-social-heading">
        <h3 id="footer-social-heading" class="footer-heading">{{ t('footer.social') }}</h3>
        <ul class="footer-links social-links">
          <li v-for="item in socialLinks" :key="item.href">
            <a
              class="footer-link social-link"
              :href="item.href"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="item.label"
            >
              <svg
                v-if="item.label === t('footer.socialX')"
                viewBox="0 0 24 24"
                aria-hidden="true"
                class="social-icon"
              >
                <path
                  fill="currentColor"
                  d="M18.9 2H22l-6.77 7.73L23.2 22h-6.26l-4.9-7.4L5.56 22H2.45l7.24-8.27L1.8 2h6.4l4.43 6.83L18.9 2Zm-1.1 18h1.73L7.26 3.9H5.4L17.8 20Z"
                />
              </svg>
              <svg
                v-else-if="item.label === t('footer.socialInstagram')"
                viewBox="0 0 24 24"
                aria-hidden="true"
                class="social-icon"
              >
                <path
                  fill="currentColor"
                  d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm0 1.9A3.9 3.9 0 0 0 3.9 7.8v8.4A3.9 3.9 0 0 0 7.8 20h8.4a3.9 3.9 0 0 0 3.9-3.9V7.8a3.9 3.9 0 0 0-3.9-3.9H7.8Zm8.7 1.5a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.9a3.1 3.1 0 1 0 0 6.2 3.1 3.1 0 0 0 0-6.2Z"
                />
              </svg>
              <svg v-else viewBox="0 0 24 24" aria-hidden="true" class="social-icon">
                <path
                  fill="currentColor"
                  d="M21.6 7.3a2.8 2.8 0 0 0-2-2c-1.8-.5-9-.5-9.6-.5-.6 0-7.8 0-9.6.5a2.8 2.8 0 0 0-2 2A29.8 29.8 0 0 0 0 12a29.8 29.8 0 0 0 .4 4.7 2.8 2.8 0 0 0 2 2c1.8.5 9 .5 9.6.5.6 0 7.8 0 9.6-.5a2.8 2.8 0 0 0 2-2A29.8 29.8 0 0 0 24 12a29.8 29.8 0 0 0-.4-4.7ZM9.6 15.5V8.5l6 3.5-6 3.5Z"
                />
              </svg>
            </a>
          </li>
        </ul>
      </nav>
    </div>

    <div class="footer-bottom">
      <p class="copyright">© {{ year }} {{ t('app.name') }}. {{ t('footer.rights') }}</p>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  position: relative;
  z-index: 1;
  margin-top: auto;
  border-top: 1px solid var(--glass-border);
  background: rgba(10, 10, 26, 0.84);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.footer-container {
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: 0.62rem clamp(0.7rem, 3vw, 1.5rem);
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
}

.footer-group {
  min-width: 0;
}

.brand-group {
  padding-bottom: 0.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.footer-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-family: var(--font-display);
  font-size: 1.16rem;
  letter-spacing: 0.6px;
  color: var(--gold);
  margin: 0 0 0.2rem;
}

.brand-icon {
  font-size: 1.05rem;
}

.brand-copy {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.78rem;
  line-height: 1.35;
}

.footer-heading {
  margin: 0 0 0.25rem;
  color: var(--text-secondary);
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 1.6px;
}

.footer-links {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.1rem;
}

.footer-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.85rem;
  border-radius: var(--radius-sm);
  padding: 0.1rem 0.28rem;
  line-height: 1.3;
}

.footer-link:hover {
  color: var(--gold-light);
  background: rgba(255, 255, 255, 0.03);
}

.footer-link:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
  color: var(--gold-light);
}

.social-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.social-link {
  width: 42px;
  min-width: 42px;
  height: 42px;
  min-height: 42px;
  padding: 0;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
}
.social-icon {
  width: 17px;
  height: 17px;
}

.footer-bottom {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding: 0.45rem clamp(0.7rem, 3vw, 1.5rem) calc(0.45rem + env(safe-area-inset-bottom));
}

.copyright {
  width: min(1120px, 100%);
  margin: 0 auto;
  color: var(--text-muted);
  font-size: 0.76rem;
  line-height: 1.3;
}

@media (max-width: 430px) {
  .footer-container {
    padding-top: 0.56rem;
    padding-bottom: 0.5rem;
    gap: 0.45rem;
  }
  .footer-group {
    padding-top: 0.02rem;
  }
  .footer-heading {
    margin-bottom: 0.2rem;
  }
  .footer-link {
    min-height: 42px;
  }
}

@media (min-width: 768px) {
  .footer-container {
    grid-template-columns: 1fr 1fr;
    gap: 0.7rem 1.1rem;
  }
  .brand-group {
    grid-column: 1 / -1;
    border-bottom: 0;
    padding-bottom: 0;
  }
}

@media (min-width: 1024px) {
  .footer-container {
    grid-template-columns: 1.3fr 1fr 1fr 1fr;
    align-items: start;
    gap: 1.1rem;
    padding-top: 0.95rem;
    padding-bottom: 0.85rem;
  }
  .brand-group {
    grid-column: auto;
  }
}
</style>
