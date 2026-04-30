<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

defineProps<{
  title: string;
  description: string;
  icon: string;
}>();
</script>

<template>
  <div class="locked-card glass-card">
    <div class="lock-overlay">
      <span class="lock-icon">🔒</span>
      <span class="premium-tag">{{ t('premium.premiumTag') }}</span>
    </div>
    <div class="content">
      <span class="icon">{{ icon }}</span>
      <h3>{{ title }}</h3>
      <p>{{ description }}</p>
      <button class="upgrade-btn">{{ t('premium.unlock') }}</button>
    </div>
  </div>
</template>

<style scoped>
.locked-card {
  position: relative;
  padding: 2rem 1.6rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 220px;
  transition: transform 0.3s ease;
}
.locked-card:hover { transform: translateY(-3px); }
.lock-overlay {
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(201, 168, 76, 0.2) 0%, rgba(201, 168, 76, 0.05) 100%);
  border: 1px solid var(--glass-border);
  font-size: 0.7rem;
  color: var(--gold-light);
  text-transform: uppercase;
  letter-spacing: 1px;
}
.lock-icon { font-size: 0.85rem; }
.premium-tag { font-weight: 600; }
.content {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  filter: blur(0.4px);
  opacity: 0.95;
}
.icon { font-size: 2.5rem; color: var(--gold); }
h3 { font-family: var(--font-display); font-size: 1.3rem; color: var(--text-primary); }
p { color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6; flex: 1; }
.upgrade-btn {
  margin-top: 0.5rem;
  padding: 0.6rem 1.2rem;
  background: transparent;
  color: var(--gold);
  border: 1px solid var(--gold);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 0.8rem;
  letter-spacing: 1px;
  text-transform: uppercase;
  transition: all 0.3s ease;
  align-self: flex-start;
}
.upgrade-btn:hover {
  background: var(--gold);
  color: var(--bg-deep);
  box-shadow: 0 0 20px var(--gold-glow);
}
</style>
