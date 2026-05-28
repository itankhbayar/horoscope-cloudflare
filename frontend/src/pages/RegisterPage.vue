<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuth } from '../composables/useAuth';
import { horoscopeService } from '../lib';
import { buildOnboardingPreview } from '../lib/onboardingPreview';
import type { City, PersonalSkyLayer } from '../lib/types';
import { compatibilitySignupAttribution } from '../lib/compatibilityAnalytics';
import { track } from '../lib/analytics';
import { normalizeCitySearchQuery, pickBestCityMatch } from '../lib/citySearch';
import { formatRegisterApiError } from '../lib/registerErrors';

type Step = 'birth' | 'value' | 'account';

const router = useRouter();
const route = useRoute();
const { t, locale } = useI18n();
const { register } = useAuth();

const step = ref<Step>('birth');
const fullName = ref('');
const email = ref('');
const password = ref('');
const birthDate = ref('');
const birthTime = ref('');
const birthCity = ref('');
const birthDataConsent = ref(false);
const errorMsg = ref('');
const isLoading = ref(false);
const preview = ref<PersonalSkyLayer | null>(null);
const suggestions = ref<City[]>([]);
const selectedCity = ref<City | null>(null);
const showSuggestions = ref(false);
const accountPromptTracked = ref(false);
const completed = ref(false);

let citySearchTimer: ReturnType<typeof setTimeout> | null = null;
let pickingCity = false;
const fallbackCities: City[] = [
  { name: 'Ulaanbaatar', country: 'Mongolia', latitude: 47.9212, longitude: 106.9186, timezoneOffset: 8 },
  { name: 'Erdenet', country: 'Mongolia', latitude: 49.0276, longitude: 104.0444, timezoneOffset: 8 },
  { name: 'Darkhan', country: 'Mongolia', latitude: 49.4867, longitude: 105.9228, timezoneOffset: 8 },
  { name: 'Khovd', country: 'Mongolia', latitude: 48.0056, longitude: 91.6419, timezoneOffset: 7 },
];

const isMn = computed(() => locale.value.startsWith('mn'));
const copy = computed(() => ({
  birthTitle: isMn.value ? 'Эхлээд уншлагаа үзье' : 'Start with your first reading',
  valueTitle: isMn.value ? 'Таны эхний тэнгэрийн товч' : 'Your first sky preview',
  accountTitle: isMn.value ? 'Уншлагаа хадгалах уу?' : 'Save your reading?',
  birthSubtitle: isMn.value
    ? 'Зөвхөн төрсөн огноо, хот хэрэгтэй. Төрсөн цаг байвал сайн, байхгүй бол алгасаж болно.'
    : 'Add only your birth date and city. Birth time helps, but you can continue without it.',
  valueSubtitle: isMn.value
    ? 'Бүртгэл үүсгэхээс өмнө Astralis танд юу өгч чадахыг хараарай.'
    : 'See what Astralis can give you before creating an account.',
  accountSubtitle: isMn.value
    ? 'Уншлагаа хадгалаад хувийн тэнгэрийн түүхээ эхлүүлээрэй.'
    : 'Save your reading and build your personal sky history.',
  birthDate: isMn.value ? 'Төрсөн огноо / Birth date' : 'Birth date',
  birthCity: isMn.value ? 'Төрсөн хот / Birth city' : 'Birth city',
  birthTime: isMn.value ? 'Төрсөн цаг / Birth time (optional)' : 'Birth time (optional)',
  birthTimeHelp: isMn.value
    ? 'Төрсөн цагаа нэмбэл мандах орд болон гэрийн байрлал нээгдэнэ. Цаггүй байсан ч уншлага гарна, харин цагтай холбоотой хэсэг арай ерөнхий байна.'
    : 'Adding your birth time unlocks your rising sign and house placements. Without it, your reading still works, but timing-specific parts are less exact.',
  showPreview: isMn.value ? 'Уншлагаа харах / Show my preview' : 'Show my preview',
  creatingPreview: isMn.value ? 'Товч уншлага үүсгэж байна...' : 'Creating preview...',
  editBirth: isMn.value ? 'Төрсөн мэдээллээ засах' : 'Edit birth details',
  identity: isMn.value ? 'Таних тэмдэг' : 'Identity',
  todaySky: isMn.value ? 'Өнөөдрийн тэнгэр' : "Today's sky",
  missing: isMn.value ? 'Дутуу байгаа давхарга' : "What you're missing",
  future: isMn.value ? 'Дараагийн үнэ цэн' : 'Future value',
  account: isMn.value ? 'Бүртгэл' : 'Account',
  google: isMn.value ? 'Google-ээр үргэлжлүүлэх' : 'Continue with Google',
  apple: isMn.value ? 'Apple-аар үргэлжлүүлэх' : 'Continue with Apple',
  email: isMn.value ? 'И-мэйлээр үргэлжлүүлэх' : 'Continue with Email',
  socialUnavailable: isMn.value
    ? 'Энэ хувилбарт Google болон Apple нэвтрэлт холбогдоогүй тул и-мэйл нь одоогийн аюулгүй бүртгэлийн зам хэвээр байна.'
    : 'Google and Apple sign-in are not connected in this build yet, so email keeps the existing secure account path.',
  cityFallback: isMn.value
    ? 'Тэр хотыг олсонгүй. Ойролцоох том хот эсвэл аймгийн төвийг сонгоорой. Дараа нь засаж болно.'
    : 'We could not find that city. Choose a nearby larger city or regional capital. You can refine it later.',
  reportMissingCity: isMn.value ? 'Олдохгүй хот мэдээлэх' : 'Report missing city',
  consent: isMn.value
    ? 'Astralis миний төрсөн огноо, хот, заавал биш төрсөн цагийг уншлага тооцоолоход ашиглаж болно. Хот нь тэнгэрийг зөв байрлуулахад хэрэгтэй. Би энэ мэдээллээ дараа устгаж болно.'
    : 'Astralis can use my birth date, city, and optional birth time to calculate this reading. My city helps place the sky correctly, and I can delete this data later.',
  privacyPolicy: isMn.value ? 'Нууцлалын бодлого' : 'Privacy Policy',
  missingBirthDate: isMn.value ? 'Төрсөн огноогоо оруулна уу.' : 'Add your birth date.',
  missingCity: isMn.value ? 'Жагсаалтаас төрсөн хотоо сонгоно уу.' : 'Choose a city from the list.',
  invalidTime: isMn.value ? 'Төрсөн цаг HH:MM хэлбэртэй байх эсвэл хоосон үлдээж болно.' : 'Use HH:MM for birth time, or leave it blank.',
}));

const canReportMissingCity = computed(
  () => birthCity.value.trim().length >= 2 && !selectedCity.value && suggestions.value.length === 0 && showSuggestions.value,
);
const previewModel = computed(() => preview.value
  ? buildOnboardingPreview(preview.value, {
    hasBirthTime: Boolean(birthTime.value),
    cityName: selectedCity.value?.name,
    locale: locale.value,
  })
  : null);
const missingCityHref = computed(() => {
  const params = new URLSearchParams({
    subject: 'Missing birth city',
    body: birthCity.value.trim()
      ? `I could not find this birth city in Astralis: ${birthCity.value.trim()}`
      : 'I could not find my birth city in Astralis.',
  });
  return `mailto:support@astralis.app?${params.toString()}`;
});

onMounted(() => {
  track('onboarding_started', { surface: 'register', step: 'birth_data' });
});

onBeforeUnmount(() => {
  if (completed.value) return;
  track('onboarding_abandoned', {
    surface: 'register',
    step: step.value === 'birth' ? 'birth_data' : step.value === 'value' ? 'first_value' : 'account_prompt',
    hasSeenValue: Boolean(preview.value),
  });
});

watch(birthCity, (val) => {
  if (pickingCity) {
    pickingCity = false;
    return;
  }
  selectedCity.value = null;
  if (citySearchTimer) clearTimeout(citySearchTimer);
  const searchQuery = normalizeCitySearchQuery(val);
  if (!searchQuery || searchQuery.length < 2) {
    suggestions.value = [];
    return;
  }
  citySearchTimer = setTimeout(async () => {
    try {
      suggestions.value = await horoscopeService.searchCities(searchQuery, 8);
      showSuggestions.value = true;
    } catch {
      suggestions.value = [];
    }
  }, 250);
});

async function tryResolveCityFromInput(): Promise<boolean> {
  if (selectedCity.value) return true;
  const searchQuery = normalizeCitySearchQuery(birthCity.value);
  if (searchQuery.length < 2) return false;
  try {
    const results = await horoscopeService.searchCities(searchQuery, 8);
    const match = pickBestCityMatch(results, birthCity.value);
    if (match) {
      pickCity(match);
      return true;
    }
  } catch {
    // Keep manual fallback chips when search is unavailable.
  }
  return Boolean(selectedCity.value);
}

async function onBirthCityBlur(): Promise<void> {
  await tryResolveCityFromInput();
  showSuggestions.value = false;
}

function pickCity(city: City): void {
  pickingCity = true;
  selectedCity.value = city;
  birthCity.value = `${city.name}, ${city.country}`;
  suggestions.value = [];
  showSuggestions.value = false;
}

async function generatePreview(): Promise<void> {
  errorMsg.value = '';
  if (!birthDate.value) {
    errorMsg.value = copy.value.missingBirthDate;
    return;
  }
  if (!selectedCity.value) {
    await tryResolveCityFromInput();
  }
  if (!selectedCity.value) {
    errorMsg.value = copy.value.missingCity;
    track('onboarding_abandoned', { surface: 'register', step: 'birth_city', hasSeenValue: false });
    return;
  }
  if (birthTime.value && !/^([01]\d|2[0-3]):[0-5]\d$/.test(birthTime.value)) {
    errorMsg.value = copy.value.invalidTime;
    return;
  }
  isLoading.value = true;
  try {
    track('birth_data_completed', {
      hasBirthTime: Boolean(birthTime.value),
      cityCountry: selectedCity.value.country,
    });
    preview.value = await horoscopeService.fetchPersonalSkyLayer({ birthDate: birthDate.value });
    if (birthTime.value) {
      track('preview_birth_time_added', { surface: 'register' });
    }
    track('first_value_shown', {
      surface: 'register',
      valueType: 'personal_sky_preview',
      hasBirthTime: Boolean(birthTime.value),
    });
    track('preview_viewed', {
      surface: 'register',
      sign: preview.value.sign,
      hasBirthTime: Boolean(birthTime.value),
    });
    step.value = 'value';
  } catch (err) {
    errorMsg.value = formatRegisterApiError(err, locale.value);
  } finally {
    isLoading.value = false;
  }
}

function showAccountPrompt(): void {
  step.value = 'account';
  track('preview_cta_clicked', { surface: 'register', cta: 'save_reading' });
  if (accountPromptTracked.value) return;
  accountPromptTracked.value = true;
  track('account_creation_prompt_shown', { surface: 'register', valueType: 'personal_sky_preview' });
}

function signupAttribution(): { signup_source: string | null; share_ref: string | null } {
  return compatibilitySignupAttribution(route.query);
}

async function handleRegister(): Promise<void> {
  if (!selectedCity.value) return;
  errorMsg.value = '';
  isLoading.value = true;
  track('signup_started', { step: 'after_value', ...signupAttribution() });
  try {
    await register(
      {
        fullName: fullName.value,
        email: email.value,
        password: password.value,
        birthDate: birthDate.value,
        birthTime: birthTime.value || null,
        birthCity: selectedCity.value.name,
        birthCountry: selectedCity.value.country,
        latitude: selectedCity.value.latitude,
        longitude: selectedCity.value.longitude,
        timezoneOffset: selectedCity.value.timezoneOffset,
        birthDataConsent: birthDataConsent.value,
      },
      {
        signupSource: signupAttribution().signup_source,
        shareRef: signupAttribution().share_ref,
      },
    );
    completed.value = true;
    track('account_created_after_value', { method: 'email', hasBirthProfile: true });
    track('preview_account_created', { method: 'email', hasBirthProfile: true });
    router.push('/');
  } catch (err) {
    errorMsg.value = formatRegisterApiError(err, locale.value);
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card auth-surface onboarding-card">
      <div class="auth-logo">
        <div class="logo-symbol">✦</div>
        <div class="logo-stars">☽ ⋆ ☾</div>
      </div>

      <p class="step-label">{{ step === 'birth' ? '1 / 3' : step === 'value' ? '2 / 3' : '3 / 3' }}</p>
      <h1 class="auth-title">{{ step === 'birth' ? copy.birthTitle : step === 'value' ? copy.valueTitle : copy.accountTitle }}</h1>
      <p class="auth-subtitle">{{ step === 'birth' ? copy.birthSubtitle : step === 'value' ? copy.valueSubtitle : copy.accountSubtitle }}</p>

      <form v-if="step === 'birth'" @submit.prevent="generatePreview" class="auth-form" novalidate>
        <div class="form-group">
          <label class="form-label" for="register-birth-date">{{ copy.birthDate }}</label>
          <input id="register-birth-date" v-model="birthDate" type="date" class="form-input" required />
        </div>

        <div class="form-group city-group">
          <label class="form-label" for="register-birth-city">{{ copy.birthCity }}</label>
          <input
            id="register-birth-city"
            v-model="birthCity"
            type="text"
            class="form-input"
            placeholder="Ulaanbaatar, Erdenet, Darkhan..."
            required
            autocomplete="off"
            @focus="showSuggestions = true"
            @blur="onBirthCityBlur"
          />
          <ul v-if="showSuggestions && suggestions.length" class="suggestions" aria-label="City search results">
            <li v-for="city in suggestions" :key="`${city.name}-${city.country}-${city.latitude}`">
              <button type="button" class="suggestion-button" @mousedown.prevent="pickCity(city)">
                <span>{{ city.name }}</span>
                <span class="country">{{ city.country }} · UTC{{ city.timezoneOffset >= 0 ? `+${city.timezoneOffset}` : city.timezoneOffset }}</span>
              </button>
            </li>
          </ul>
          <div v-else-if="canReportMissingCity" class="city-fallback">
            <p>{{ copy.cityFallback }}</p>
            <div class="fallback-city-row">
              <button v-for="city in fallbackCities" :key="city.name" type="button" @mousedown.prevent="pickCity(city)">
                {{ city.name }}
              </button>
            </div>
            <a :href="missingCityHref">{{ copy.reportMissingCity }}</a>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="register-birth-time">{{ copy.birthTime }}</label>
          <input id="register-birth-time" v-model="birthTime" type="time" class="form-input" />
          <p class="field-help">{{ copy.birthTimeHelp }}</p>
        </div>

        <div v-if="errorMsg" class="error-msg" role="alert">{{ errorMsg }}</div>

        <button type="submit" class="btn-celestial" :disabled="isLoading">
          <span v-if="isLoading">{{ copy.creatingPreview }}</span>
          <span v-else>{{ copy.showPreview }}</span>
        </button>
      </form>

      <section v-else-if="step === 'value'" class="value-preview">
        <div class="identity-hero">
          <p class="preview-kicker">{{ copy.identity }}</p>
          <h2>{{ previewModel?.identityTitle }}</h2>
          <p class="preview-main">{{ previewModel?.identityBody }}</p>
          <div class="identity-tags">
            <span>{{ previewModel?.element }}</span>
            <span>{{ previewModel?.modality }}</span>
          </div>
        </div>

        <div class="preview-card">
          <p class="preview-kicker">{{ copy.todaySky }}</p>
          <strong>{{ previewModel?.todayTheme }}</strong>
          <span>{{ previewModel?.transitTitle }}</span>
          <span>{{ previewModel?.transitBody }}</span>
        </div>

        <div class="preview-card">
          <p class="preview-kicker">{{ copy.missing }}</p>
          <strong>{{ previewModel?.missingTitle }}</strong>
          <ul>
            <li v-for="item in previewModel?.missingItems" :key="item">{{ item }}</li>
          </ul>
          <span>{{ previewModel?.missingBody }}</span>
        </div>

        <div class="preview-card">
          <p class="preview-kicker">{{ copy.future }}</p>
          <strong>{{ previewModel?.futureTitle }}</strong>
          <span>{{ previewModel?.futureBody }}</span>
        </div>

        <button type="button" class="btn-celestial" @click="showAccountPrompt">{{ previewModel?.saveTitle }}</button>
        <button type="button" class="text-button" @click="step = 'birth'">{{ copy.editBirth }}</button>
      </section>

      <form v-else @submit.prevent="handleRegister" class="auth-form">
        <div class="save-panel">
          <p class="preview-kicker">{{ copy.account }}</p>
          <h2>{{ previewModel?.saveTitle }}</h2>
          <p class="field-help">{{ previewModel?.saveBody }}</p>
          <button type="button" class="social-button" disabled>{{ copy.google }}</button>
          <button type="button" class="social-button" disabled>{{ copy.apple }}</button>
          <p class="field-help">{{ copy.socialUnavailable }}</p>
        </div>

        <div class="form-group">
          <label class="form-label" for="register-full-name">{{ t('auth.fullName') }}</label>
          <input id="register-full-name" v-model="fullName" type="text" class="form-input" :placeholder="t('auth.fullNamePlaceholder')" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="register-email">{{ t('auth.email') }}</label>
          <input id="register-email" v-model="email" type="email" class="form-input" :placeholder="t('auth.emailPlaceholder')" required autocomplete="email" />
        </div>
        <div class="form-group">
          <label class="form-label" for="register-password">{{ t('auth.password') }}</label>
          <input id="register-password" v-model="password" type="password" class="form-input" :placeholder="t('auth.passwordPlaceholder')" required minlength="8" maxlength="128" autocomplete="new-password" />
        </div>

        <label class="consent-box">
          <input v-model="birthDataConsent" type="checkbox" required />
          <span>
            {{ copy.consent }}
            <router-link to="/privacy">{{ copy.privacyPolicy }}</router-link>.
          </span>
        </label>

        <div v-if="errorMsg" class="error-msg" role="alert">{{ errorMsg }}</div>

        <button type="submit" class="btn-celestial" :disabled="isLoading">
          <span v-if="isLoading">{{ t('auth.creatingAccount') }}</span>
          <span v-else>{{ copy.email }}</span>
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
.onboarding-card {
  max-width: 520px;
  padding: 2.2rem 2rem;
}
.auth-title {
  font-size: 1.7rem;
}
.step-label,
.preview-kicker {
  margin: 0 0 0.35rem;
  color: var(--gold-light);
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.city-group {
  position: relative;
}
.field-help {
  margin: 0.45rem 0 0;
  color: var(--text-muted);
  font-size: 0.8rem;
  line-height: 1.45;
}
.suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: rgba(20, 15, 40, 0.96);
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
  margin: 0;
}
.suggestion-button {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  min-height: 38px;
  padding: 0.55rem 0.7rem;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  font: inherit;
  text-align: left;
}
.suggestion-button:hover,
.suggestion-button:focus-visible {
  background: var(--gold-glow);
  color: var(--gold-light);
  outline: none;
}
.country {
  color: var(--text-muted);
  font-size: 0.75rem;
  white-space: nowrap;
}
.city-fallback,
.save-panel,
.preview-card {
  margin-top: 0.7rem;
  padding: 0.85rem;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.035);
}
.city-fallback p {
  margin: 0 0 0.35rem;
  color: var(--text-secondary);
  font-size: 0.82rem;
  line-height: 1.45;
}
.city-fallback a,
.text-button {
  color: var(--gold-light);
}
.fallback-city-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.5rem;
}
.fallback-city-row button {
  min-height: 34px;
  border: 1px solid var(--glass-border-hover);
  border-radius: 999px;
  padding: 0 0.7rem;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  cursor: pointer;
}
.value-preview {
  display: grid;
  gap: 1rem;
}
.identity-hero {
  display: grid;
  gap: 0.55rem;
  padding: 1rem;
  border: 1px solid var(--glass-border-hover);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.05);
}
.value-preview h2,
.save-panel h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.15rem;
  line-height: 1.25;
}
.preview-main,
.preview-card span {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.92rem;
  line-height: 1.55;
}
.preview-card {
  display: grid;
  gap: 0.35rem;
}
.preview-card ul {
  margin: 0;
  padding-left: 1.1rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.45;
}
.preview-card strong {
  color: var(--gold-light);
}
.identity-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}
.identity-tags span {
  border: 1px solid var(--glass-border-hover);
  border-radius: 999px;
  padding: 0.25rem 0.65rem;
  color: var(--gold-light);
  font-size: 0.78rem;
  font-weight: 800;
}
.social-button {
  width: 100%;
  min-height: 42px;
  margin-top: 0.6rem;
  border: 1px solid var(--glass-border-hover);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
  opacity: 0.62;
}
.text-button {
  border: 0;
  background: transparent;
  cursor: pointer;
  font-weight: 700;
}
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
@media (max-width: 420px) {
  .auth-title {
    font-size: 1.45rem;
  }
  .suggestion-button {
    flex-direction: column;
    gap: 0.15rem;
  }
  .country {
    white-space: normal;
  }
}
</style>
