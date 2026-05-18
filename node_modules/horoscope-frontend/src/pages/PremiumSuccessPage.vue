<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import AppContainer from '../components/layout/AppContainer.vue';
import ScreenLayout from '../components/layout/ScreenLayout.vue';
import { useAuth } from '../composables/useAuth';

const { t } = useI18n();
const router = useRouter();
const { refreshUser } = useAuth();
const error = ref<string | null>(null);
const syncing = ref(true);

onMounted(async () => {
  try {
    await refreshUser();
  } catch (e) {
    error.value = (e as Error).message ?? t('premium.syncError');
  } finally {
    syncing.value = false;
  }
});

function goHome() {
  router.push({ name: 'home' });
}
</script>

<template>
  <AppContainer size="md">
    <ScreenLayout class="premium-result">
      <h1>{{ t('premium.successTitle') }}</h1>
      <p v-if="syncing" class="muted">{{ t('premium.syncing') }}</p>
      <p v-else-if="error" class="error">{{ error }}</p>
      <p v-else class="muted">{{ t('premium.successBody') }}</p>
      <button type="button" class="btn-celestial" :disabled="syncing" @click="goHome">
        {{ t('premium.backHome') }}
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
.error {
  color: var(--danger, #e57373);
}
</style>
