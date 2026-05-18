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
    <div class="auth-card auth-surface">
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
.logo-symbol {
  animation: float 4s ease-in-out infinite;
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
</style>
