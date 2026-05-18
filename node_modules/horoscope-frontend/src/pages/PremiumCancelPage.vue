<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import AppContainer from '../components/layout/AppContainer.vue';
import ScreenLayout from '../components/layout/ScreenLayout.vue';

const { t } = useI18n();
const router = useRouter();

function tryAgain() {
  router.push({ name: 'premium' });
}
</script>

<template>
  <AppContainer size="md">
    <ScreenLayout class="premium-result">
      <h1>{{ t('premium.cancelTitle') }}</h1>
      <p class="muted">{{ t('premium.cancelBody') }}</p>
      <button type="button" class="btn-celestial" @click="tryAgain">
        {{ t('premium.tryAgain') }}
      </button>
    </ScreenLayout>
  </AppContainer>
</template>

<style scoped>
.premium-result {
  text-align: center;
  gap: 1.25rem;
  padding: 2rem 0;
}
h1 {
  font-family: var(--font-display);
  font-size: 1.75rem;
}
.muted {
  color: var(--text-muted);
}
</style>
