<script setup lang="ts">
import AppContainer from '../components/layout/AppContainer.vue';
import ScreenLayout from '../components/layout/ScreenLayout.vue';
import { useDocumentMeta } from '../composables/useDocumentMeta';

const contactEmail = 'ankhbayr2017@gmail.com';

useDocumentMeta({
  title: 'Privacy Policy | Astralis',
  description:
    'Privacy Policy for Astralis covering account data, horoscope preferences, billing, notifications, analytics, and account deletion.',
  canonicalPath: '/privacy',
});
</script>

<template>
  <AppContainer size="lg">
    <ScreenLayout class="legal-page">
      <article class="glass-card legal-card">
        <p class="legal-kicker">Astralis Privacy Policy</p>
        <h1>Privacy Policy</h1>
        <p class="legal-updated">Last updated: May 21, 2026</p>
        <p>
          Astralis provides horoscope, tarot, compatibility, and birth chart features. This policy
          explains what data we collect, why we use it, and how you can request deletion.
        </p>

        <section>
          <h2>Information We Collect</h2>
          <p>
            We collect account and profile details such as your name, email address, password hash,
            avatar, display name, bio, and app settings. We never store raw passwords.
          </p>
          <p>
            Horoscope features may store birth date, optional birth time, birth city, country,
            latitude, longitude, timezone offset, zodiac placements, natal chart data, compatibility
            results, tarot preferences, and cached personalized content needed to provide readings.
          </p>
        </section>

        <section>
          <h2>Timezone And Location</h2>
          <p>
            Birth location and timezone information are used to calculate chart placements and daily
            guidance timing. If you provide coordinates instead of a city, we use those coordinates
            only for horoscope and chart functionality.
          </p>
        </section>

        <section>
          <h2>Billing</h2>
          <p>
            Subscription checkout and billing are handled by Stripe or by Apple/Google app store
            billing where available. We store billing identifiers such as Stripe customer or
            subscription IDs so we can activate Premium access, sync subscription state, and provide
            billing support. We do not store full card numbers.
          </p>
        </section>

        <section>
          <h2>Notifications</h2>
          <p>
            If you enable push notifications, we store notification preferences and Expo push tokens,
            including platform and device metadata needed to deliver or disable notifications.
          </p>
        </section>

        <section>
          <h2>Analytics And Crash Reporting</h2>
          <p>
            The current app does not include a dedicated third-party analytics or crash reporting SDK.
            If we add analytics or crash reporting later, we will update this policy to describe the
            provider, event categories, retention, and opt-out choices where applicable.
          </p>
        </section>

        <section>
          <h2>Account Deletion</h2>
          <p>
            You can request deletion from the in-app profile/settings area or visit the public
            account deletion instructions. Deletion removes or anonymizes account credentials,
            profile records, birth profile data, natal chart data, push notification tokens,
            notification preferences, and cached personalized content tied to your account.
          </p>
          <p>
            Subscription cancellation may also need to be managed through Apple, Google, or Stripe
            billing settings, depending on where you subscribed.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            Privacy requests can be sent to
            <a :href="`mailto:${contactEmail}`">{{ contactEmail }}</a>.
          </p>
        </section>
      </article>
    </ScreenLayout>
  </AppContainer>
</template>

<style scoped>
.legal-page {
  padding: var(--space-8) 0;
}
.legal-card {
  padding: clamp(1.25rem, 4vw, 2.5rem);
  display: grid;
  gap: var(--space-5);
}
.legal-kicker,
.legal-updated {
  color: var(--gold-light);
  text-transform: uppercase;
  letter-spacing: 1.4px;
  font-size: var(--text-xs);
}
h1,
h2 {
  font-family: var(--font-display);
  color: var(--text-primary);
}
h1 {
  font-size: clamp(2.2rem, 8vw, 4rem);
  line-height: 1;
}
h2 {
  font-size: clamp(1.35rem, 4vw, 1.8rem);
  margin-bottom: var(--space-2);
}
p {
  color: var(--text-secondary);
  max-width: 72ch;
}
a {
  color: var(--gold-light);
}
section {
  display: grid;
  gap: var(--space-2);
}
</style>
