<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const legalLinks = computed(() => [
  { to: '/terms', label: t('footer.terms') },
  { to: '/privacy', label: t('footer.privacy') },
]);

const socialLinks = computed(() => [
  { href: 'https://x.com', label: t('footer.socialX'), icon: 'x' },
  { href: 'https://instagram.com', label: t('footer.socialInstagram'), icon: 'instagram' },
  { href: 'https://youtube.com', label: t('footer.socialYoutube'), icon: 'youtube' },
]);

const year = new Date().getFullYear();
</script>

<template>
  <footer class="site-footer" role="contentinfo">
    <div class="footer-glow" aria-hidden="true" />

    <div class="footer-inner">
      <div class="footer-main">
        <router-link class="footer-brand" to="/" :aria-label="t('app.name')">
          <span class="brand-mark" aria-hidden="true">✦</span>
          <span class="brand-text">{{ t('app.name') }}</span>
        </router-link>

        <nav class="footer-links" :aria-label="t('footer.legal')">
          <router-link
            v-for="item in legalLinks"
            :key="item.to"
            class="footer-link"
            :to="item.to"
          >
            {{ item.label }}
          </router-link>
        </nav>

        <ul class="social-links" :aria-label="t('footer.social')">
          <li v-for="item in socialLinks" :key="item.href">
            <a
              class="social-link"
              :href="item.href"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="item.label"
            >
              <svg v-if="item.icon === 'x'" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M18.9 2H22l-6.77 7.73L23.2 22h-6.26l-4.9-7.4L5.56 22H2.45l7.24-8.27L1.8 2h6.4l4.43 6.83L18.9 2Zm-1.1 18h1.73L7.26 3.9H5.4L17.8 20Z"
                />
              </svg>

              <svg v-else-if="item.icon === 'instagram'" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm0 1.9A3.9 3.9 0 0 0 3.9 7.8v8.4A3.9 3.9 0 0 0 7.8 20h8.4a3.9 3.9 0 0 0 3.9-3.9V7.8a3.9 3.9 0 0 0-3.9-3.9H7.8Zm8.7 1.5a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.9a3.1 3.1 0 1 0 0 6.2 3.1 3.1 0 0 0 0-6.2Z"
                />
              </svg>

              <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M21.6 7.3a2.8 2.8 0 0 0-2-2c-1.8-.5-9-.5-9.6-.5-.6 0-7.8 0-9.6.5a2.8 2.8 0 0 0-2 2A29.8 29.8 0 0 0 0 12a29.8 29.8 0 0 0 .4 4.7 2.8 2.8 0 0 0 2 2c1.8.5 9 .5 9.6.5.6 0 7.8 0 9.6-.5a2.8 2.8 0 0 0 2-2A29.8 29.8 0 0 0 24 12a29.8 29.8 0 0 0-.4-4.7ZM9.6 15.5V8.5l6 3.5-6 3.5Z"
                />
              </svg>
            </a>
          </li>
        </ul>
      </div>

      <p class="copyright">
        © {{ year }} {{ t('app.name') }}. {{ t('footer.rights') }}
      </p>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  position: relative;
  z-index: 1;
  margin-top: auto;
  overflow: hidden;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background:
    radial-gradient(circle at 50% 0%, rgba(212, 175, 55, 0.12), transparent 34rem),
    linear-gradient(180deg, rgba(14, 13, 35, 0.72), rgba(6, 6, 18, 0.92));
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.footer-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent);
  opacity: 0.35;
}

.footer-inner {
  position: relative;
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: 1.15rem clamp(1rem, 3vw, 1.5rem) calc(0.9rem + env(safe-area-inset-bottom));
}

.footer-main {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 1rem;
}

.footer-brand {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  color: var(--gold);
  text-decoration: none;
}

.brand-mark {
  display: inline-grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  border: 1px solid rgba(212, 175, 55, 0.28);
  border-radius: 999px;
  background: rgba(212, 175, 55, 0.08);
  box-shadow: 0 0 24px rgba(212, 175, 55, 0.12);
  font-size: 0.95rem;
}

.brand-text {
  font-family: var(--font-display);
  font-size: 1.08rem;
  letter-spacing: 0.5px;
  line-height: 1;
}

.footer-links {
  justify-self: center;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.035);
}

.footer-link {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.82rem;
  line-height: 1;
  padding: 0.48rem 0.72rem;
  border-radius: 999px;
  transition:
    color 0.2s ease,
    background 0.2s ease;
}

.footer-link:hover {
  color: var(--gold-light);
  background: rgba(212, 175, 55, 0.08);
}

.social-links {
  justify-self: end;
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.social-link {
  display: inline-grid;
  width: 2.05rem;
  height: 2.05rem;
  place-items: center;
  color: var(--text-secondary);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.035);
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;
}

.social-link:hover {
  color: var(--gold-light);
  border-color: rgba(212, 175, 55, 0.28);
  background: rgba(212, 175, 55, 0.08);
  transform: translateY(-1px);
}

.social-link svg {
  width: 1rem;
  height: 1rem;
  display: block;
}

.footer-brand:focus-visible,
.footer-link:focus-visible,
.social-link:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 3px;
}

.copyright {
  margin: 0.9rem 0 0;
  padding-top: 0.85rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  color: var(--text-muted);
  font-size: 0.72rem;
  line-height: 1.4;
  text-align: center;
}

@media (max-width: 720px) {
  .footer-main {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
    gap: 0.85rem;
  }

  .footer-brand,
  .footer-links,
  .social-links {
    justify-self: center;
  }
}

@media (max-width: 420px) {
  .footer-inner {
    padding-top: 1rem;
  }

  .footer-links {
    width: 100%;
    justify-content: center;
    border-radius: 1rem;
  }

  .footer-link {
    flex: 1;
    justify-content: center;
    text-align: center;
  }
}
</style>