<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuth } from '../composables/useAuth';

const router = useRouter();
const { t } = useI18n();
const { login } = useAuth();

const email = ref('');
const password = ref('');
const errorMsg = ref('');
const isLoading = ref(false);

async function handleLogin(): Promise<void> {
  errorMsg.value = '';
  isLoading.value = true;
  try {
    await login({ email: email.value, password: password.value });
    router.push('/');
  } catch (err) {
    errorMsg.value = (err as Error).message;
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card glass-card">
      <div class="auth-logo">
        <div class="logo-symbol">☽</div>
        <div class="logo-stars">✦ ✧ ✦</div>
      </div>

      <h1 class="auth-title">{{ t('auth.welcomeBack') }}</h1>
      <p class="auth-subtitle">{{ t('auth.stepIntoCosmos') }}</p>

      <form @submit.prevent="handleLogin" class="auth-form">
        <div class="form-group">
          <label class="form-label">{{ t('auth.email') }}</label>
          <input
            v-model="email"
            type="email"
            class="form-input"
            :placeholder="t('auth.emailPlaceholder')"
            required
            autocomplete="email"
          />
        </div>
        <div class="form-group">
          <label class="form-label">{{ t('auth.password') }}</label>
          <input
            v-model="password"
            type="password"
            class="form-input"
            :placeholder="t('auth.passwordPlaceholderShort')"
            required
            autocomplete="current-password"
          />
        </div>
        <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>
        <button type="submit" class="btn-celestial" :disabled="isLoading">
          <span v-if="isLoading">✨ {{ t('auth.signingIn') }}</span>
          <span v-else>{{ t('auth.signIn') }}</span>
        </button>
      </form>

      <p class="auth-link">
        {{ t('auth.newToStars') }}
        <router-link to="/register">{{ t('auth.createAccount') }}</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 80px);
  padding: 2rem;
}
.auth-card {
  width: 100%;
  max-width: 440px;
  padding: 2.5rem 2rem;
  animation: card-appear 0.6s ease-out;
}
@keyframes card-appear {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.auth-logo { text-align: center; margin-bottom: 1.5rem; }
.logo-symbol {
  font-size: 3rem;
  color: var(--gold);
  filter: drop-shadow(0 0 20px var(--gold-dim));
  animation: float 4s ease-in-out infinite;
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
.logo-stars { font-size: 0.9rem; color: var(--gold-dim); letter-spacing: 6px; margin-top: 0.25rem; }
.auth-title {
  font-family: var(--font-display);
  font-size: 1.9rem;
  font-weight: 600;
  text-align: center;
  letter-spacing: 1px;
  margin-bottom: 0.3rem;
}
.auth-subtitle {
  font-size: 0.85rem;
  color: var(--text-muted);
  text-align: center;
  margin-bottom: 2rem;
  letter-spacing: 0.5px;
}
</style>
