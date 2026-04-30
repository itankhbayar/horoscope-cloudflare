<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuth } from '../composables/useAuth';
import { horoscopeService } from '../lib';
import type { City } from '../lib/types';

const router = useRouter();
const { t } = useI18n();
const { register } = useAuth();

const fullName = ref('');
const email = ref('');
const password = ref('');
const birthDate = ref('');
const birthTime = ref('');
const birthCity = ref('');
const errorMsg = ref('');
const isLoading = ref(false);
const suggestions = ref<City[]>([]);
const selectedCity = ref<City | null>(null);
const showSuggestions = ref(false);

let citySearchTimer: ReturnType<typeof setTimeout> | null = null;

watch(birthCity, (val) => {
  selectedCity.value = null;
  if (citySearchTimer) clearTimeout(citySearchTimer);
  if (!val || val.length < 2) {
    suggestions.value = [];
    return;
  }
  citySearchTimer = setTimeout(async () => {
    try {
      suggestions.value = await horoscopeService.searchCities(val);
      showSuggestions.value = true;
    } catch {
      suggestions.value = [];
    }
  }, 250);
});

function pickCity(city: City): void {
  selectedCity.value = city;
  birthCity.value = `${city.name}, ${city.country}`;
  showSuggestions.value = false;
}

async function handleRegister(): Promise<void> {
  errorMsg.value = '';
  isLoading.value = true;
  try {
    const cityName = selectedCity.value?.name ?? (birthCity.value.split(',')[0] ?? '').trim();
    await register({
      fullName: fullName.value,
      email: email.value,
      password: password.value,
      birthDate: birthDate.value,
      birthTime: birthTime.value || null,
      birthCity: cityName,
      birthCountry: selectedCity.value?.country ?? null,
      latitude: selectedCity.value?.latitude ?? null,
      longitude: selectedCity.value?.longitude ?? null,
      timezoneOffset: selectedCity.value?.timezoneOffset ?? null,
    });
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
        <div class="logo-symbol">✦</div>
        <div class="logo-stars">☽ ⋆ ☾</div>
      </div>

      <h1 class="auth-title">{{ t('auth.beginJourney') }}</h1>
      <p class="auth-subtitle">{{ t('auth.natalAwaits') }}</p>

      <form @submit.prevent="handleRegister" class="auth-form">
        <div class="form-group">
          <label class="form-label">{{ t('auth.fullName') }}</label>
          <input v-model="fullName" type="text" class="form-input" :placeholder="t('auth.fullNamePlaceholder')" required />
        </div>

        <div class="form-group">
          <label class="form-label">{{ t('auth.email') }}</label>
          <input v-model="email" type="email" class="form-input" :placeholder="t('auth.emailPlaceholder')" required autocomplete="email" />
        </div>

        <div class="form-group">
          <label class="form-label">{{ t('auth.password') }}</label>
          <input v-model="password" type="password" class="form-input" :placeholder="t('auth.passwordPlaceholder')" required minlength="6" autocomplete="new-password" />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">{{ t('auth.birthDateRequired') }}</label>
            <input v-model="birthDate" type="date" class="form-input" required />
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('auth.birthTimeOptional') }}</label>
            <input v-model="birthTime" type="time" class="form-input" placeholder="HH:MM" />
          </div>
        </div>

        <div class="form-group city-group">
          <label class="form-label">{{ t('auth.birthCityRequired') }}</label>
          <input
            v-model="birthCity"
            type="text"
            class="form-input"
            :placeholder="t('auth.cityPlaceholder')"
            required
            @focus="showSuggestions = true"
          />
          <ul v-if="showSuggestions && suggestions.length" class="suggestions">
            <li v-for="city in suggestions" :key="`${city.name}-${city.country}`" @click="pickCity(city)">
              <span>{{ city.name }}</span>
              <span class="country">{{ city.country }}</span>
            </li>
          </ul>
        </div>

        <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>

        <button type="submit" class="btn-celestial" :disabled="isLoading">
          <span v-if="isLoading">✨ {{ t('auth.creatingAccount') }}</span>
          <span v-else>{{ t('auth.createAccount') }}</span>
        </button>
      </form>

      <p class="auth-link">
        {{ t('auth.alreadyHaveAccount') }}
        <router-link to="/login">{{ t('auth.signIn') }}</router-link>
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
  max-width: 480px;
  padding: 2.2rem 2rem;
  animation: card-appear 0.6s ease-out;
}
@keyframes card-appear {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.auth-logo { text-align: center; margin-bottom: 1.4rem; }
.logo-symbol {
  font-size: 2.8rem;
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
  font-size: 1.7rem;
  font-weight: 600;
  text-align: center;
  letter-spacing: 1px;
  margin-bottom: 0.3rem;
}
.auth-subtitle {
  font-size: 0.85rem;
  color: var(--text-muted);
  text-align: center;
  margin-bottom: 1.6rem;
  letter-spacing: 0.5px;
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.city-group { position: relative; }
.suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: rgba(20, 15, 40, 0.95);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  list-style: none;
  padding: 0.3rem;
  z-index: 20;
  max-height: 240px;
  overflow-y: auto;
  backdrop-filter: blur(15px);
}
.suggestions li {
  display: flex;
  justify-content: space-between;
  padding: 0.55rem 0.7rem;
  cursor: pointer;
  border-radius: 6px;
  font-size: 0.85rem;
  color: var(--text-primary);
}
.suggestions li:hover {
  background: var(--gold-glow);
  color: var(--gold-light);
}
.country { color: var(--text-muted); font-size: 0.75rem; }
</style>
