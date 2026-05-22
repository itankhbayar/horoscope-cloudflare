<script setup lang="ts">
import AppContainer from '../components/layout/AppContainer.vue';
import ScreenLayout from '../components/layout/ScreenLayout.vue';
import { useDocumentMeta } from '../composables/useDocumentMeta';

useDocumentMeta({
  title: 'Terms of Service | Astralis',
  description:
    'Astralis Terms of Service covering subscriptions, auto-renewal, refunds, acceptable use, and liability limits.',
  canonicalPath: '/terms',
});
</script>

<template>
  <AppContainer size="lg">
    <ScreenLayout class="legal-page">
      <article class="glass-card legal-card">
        <p class="legal-kicker">Astralis Terms</p>
        <h1>Terms of Service</h1>
        <p class="legal-updated">Last updated: May 21, 2026</p>
        <p>
          These terms govern your use of Astralis. By creating an account or using the app, you agree
          to use the service responsibly and in accordance with these terms.
        </p>

        <section>
          <h2>Subscriptions And Billing</h2>
          <p>
            Premium features may be offered through monthly or yearly subscriptions. Prices, trial
            eligibility, and billing periods are shown before purchase. Subscription access begins
            after successful payment or trial activation.
          </p>
        </section>

        <section>
          <h2>Auto-Renewal</h2>
          <p>
            Subscriptions automatically renew unless canceled before the end of the current billing
            period. If you subscribe through Apple or Google, manage cancellation in your App Store or
            Google Play account settings. Stripe subscriptions may be managed through the billing
            portal when available.
          </p>
        </section>

        <section>
          <h2>Refunds</h2>
          <p>
            Payments are generally non-refundable except where required by law or by the applicable
            app store policy. Apple and Google purchases are subject to their refund processes, and
            Stripe purchases may be reviewed according to our support and legal obligations.
          </p>
        </section>

        <section>
          <h2>Acceptable Use</h2>
          <p>
            Do not misuse Astralis, attempt to access another account, reverse engineer protected
            systems, spam the service, interfere with payments, or use the app for unlawful,
            harmful, or abusive activity.
          </p>
        </section>

        <section>
          <h2>Wellness And Entertainment Notice</h2>
          <p>
            Horoscope, tarot, compatibility, and birth chart content is provided for reflection,
            entertainment, and personal insight. It is not medical, legal, financial, or professional
            advice.
          </p>
        </section>

        <section>
          <h2>Limitation Of Liability</h2>
          <p>
            To the maximum extent allowed by law, Astralis is provided as is and without warranties.
            We are not liable for indirect, incidental, consequential, special, or punitive damages
            arising from use of the app or reliance on horoscope content.
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
section {
  display: grid;
  gap: var(--space-2);
}
</style>
