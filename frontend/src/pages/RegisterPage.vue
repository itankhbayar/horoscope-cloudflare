<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuth } from '../composables/useAuth';
import { horoscopeService } from '../lib';
import type { City } from '../lib/types';
import FormLayout from '../components/layout/FormLayout.vue';
import { track } from '../lib/analytics';

const router = useRouter();
const { t } = useI18n();
const { register } = useAuth();

const fullName = ref('');
const email = ref('');
const password = ref('');
const birthDate = ref('');
const birthTime = ref('');
const birthCity = ref('');
const birthDataConsent = ref(false);
const errorMsg = ref('');
const isLoading = ref(false);
const suggestions = ref<City[]>([]);
const selectedCity = ref<City | null>(null);
const showSuggestions = ref(false);

let citySearchTimer: ReturnType<typeof setTimeout> | null = null;
let pickingCity = false;

watch(birthCity, (val) => {
  if (pickingCity) {
    pickingCity = false;
    return;
  }
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
  pickingCity = true;
  selectedCity.value = city;
  birthCity.value = `${city.name}, ${city.country}`;
  suggestions.value = [];
  showSuggestions.value = false;
}

async function handleRegister(): Promise<void> {
  errorMsg.value = '';
  isLoading.value = true;
  track('signup_started');
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
      birthDataConsent: birthDataConsent.value,
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
    <div class="auth-card auth-surface">
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
          <input v-model="password" type="password" class="form-input" :placeholder="t('auth.passwordPlaceholder')" required minlength="8" maxlength="128" autocomplete="new-password" />
        </div>

        <FormLayout :columns="2">
          <div class="form-group">
            <label class="form-label">{{ t('auth.birthDateRequired') }}</label>
            <input v-model="birthDate" type="date" class="form-input" required />
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('auth.birthTimeOptional') }}</label>
            <input v-model="birthTime" type="time" class="form-input" placeholder="HH:MM" />
          </div>
        </FormLayout>

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

        <label class="consent-box">
          <input v-model="birthDataConsent" type="checkbox" required />
          <span>
            I understand Astralis collects my birth date, optional birth time, and birth location to
            calculate astrology placements and generate horoscope, chart, and compatibility insights.
            I can delete my account and birth data later. See the
            <router-link to="/privacy">Privacy Policy</router-link>.
          </span>
        </label>

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
.auth-page .auth-card {
  max-width: 480px;
  padding: 2.2rem 2rem;
}
.auth-page .auth-title {
  font-size: 1.7rem;
}
.auth-page .auth-subtitle {
  margin-bottom: 1.6rem;
}
.logo-symbol {
  animation: float 4s ease-in-out infinite;
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
.city-group { position: relative; }
.consent-box {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.65rem;
  align-items: start;
  padding: 0.8rem;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-secondary);
  font-size: 0.82rem;
  line-height: 1.45;
}
.consent-box input {
  margin-top: 0.18rem;
}
.consent-box a {
  color: var(--gold-light);
}
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
@media (max-width: 420px) {
  .auth-page .auth-title {
    font-size: 1.45rem;
  }
}
</style>
