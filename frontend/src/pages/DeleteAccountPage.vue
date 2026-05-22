<script setup lang="ts">
import AppContainer from '../components/layout/AppContainer.vue';
import ScreenLayout from '../components/layout/ScreenLayout.vue';
import { useDocumentMeta } from '../composables/useDocumentMeta';

const contactEmail = 'ankhbayr2017@gmail.com';

useDocumentMeta({
  title: 'Delete Account | Astralis',
  description:
    'How to delete your Astralis account and remove personal profile, horoscope, chart, and notification data.',
  canonicalPath: '/delete-account',
});
</script>

<template>
  <AppContainer size="lg">
    <ScreenLayout class="legal-page">
      <article class="glass-card legal-card">
        <p class="legal-kicker">Account Deletion</p>
        <h1>Delete Your Account</h1>
        <p>
          You can delete your Astralis account from the app. This permanently removes your account
          credentials, profile, birth data, chart data, push notification tokens, notification
          preferences, and personalized cached content tied to your account.
        </p>

        <section>
          <h2>Delete From The App</h2>
          <ol>
            <li>Sign in to Astralis.</li>
            <li>Open Profile.</li>
            <li>Select Delete Account.</li>
            <li>Read the warning and confirm deletion.</li>
          </ol>
        </section>

        <section>
          <h2>Subscriptions</h2>
          <p>
            Deleting your Astralis account does not always cancel an active Apple App Store or Google
            Play subscription. Manage mobile subscriptions in your Apple or Google billing settings.
            Stripe subscriptions should be managed through the billing portal where available.
          </p>
        </section>

        <section>
          <h2>Need Help?</h2>
          <p>
            If you cannot access your account, contact
            <a :href="`mailto:${contactEmail}`">{{ contactEmail }}</a>
            from the email address associated with your Astralis account.
          </p>
        </section>

        <div class="actions">
          <router-link class="primary-btn" to="/profile">Open Profile</router-link>
          <router-link class="secondary-btn" to="/privacy">Read Privacy Policy</router-link>
        </div>
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
.legal-kicker {
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
p,
li {
  color: var(--text-secondary);
  max-width: 72ch;
}
ol {
  padding-left: 1.25rem;
}
a {
  color: var(--gold-light);
}
section {
  display: grid;
  gap: var(--space-2);
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}
.primary-btn,
.secondary-btn {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  padding: 0.7rem 1.1rem;
  text-decoration: none;
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 1.2px;
}
.primary-btn {
  background: linear-gradient(135deg, var(--gold), #b8962e);
  color: #1f1300;
  font-weight: 700;
}
.secondary-btn {
  border: 1px solid var(--glass-border-hover);
}
</style>
