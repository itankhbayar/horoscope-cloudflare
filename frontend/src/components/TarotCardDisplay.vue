<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { TarotPublicCard } from '../lib/types';

defineProps<{ card: TarotPublicCard; label: string }>();

const { t } = useI18n();

function arcanaLabel(v: 'Major' | 'Minor'): string {
  return v === 'Major' ? t('tarot.major') : t('tarot.minor');
}
function orientationLabel(v: 'Upright' | 'Reversed'): string {
  return v === 'Upright' ? t('tarot.upright') : t('tarot.reversed');
}
</script>

<template>
  <article class="card-block glass-card" :class="{ reversed: card.orientation === 'Reversed' }">
    <div v-if="card.image" class="card-art">
      <img :src="card.image" :alt="card.name" class="card-image" loading="lazy" />
    </div>

    <span class="block-title">{{ label }}</span>
    <h2 class="card-name">{{ card.name }}</h2>
    <div class="badges">
      <span class="badge" :class="card.arcana === 'Major' ? 'major' : 'minor'">{{ arcanaLabel(card.arcana) }}</span>
      <span class="badge" :class="card.orientation === 'Upright' ? 'upright' : 'reversed-badge'">
        <span class="badge-arrow" aria-hidden="true">{{ card.orientation === 'Upright' ? '↑' : '↓' }}</span>
        {{ orientationLabel(card.orientation) }}
      </span>
    </div>
    <ul v-if="card.keywords.length" class="keywords" :aria-label="t('tarot.keywords')">
      <li v-for="kw in card.keywords" :key="kw" class="keyword-chip">{{ kw }}</li>
    </ul>

    <div v-if="card.description" class="card-field">
      <h3 class="field-label">{{ t('tarot.description') }}</h3>
      <p class="card-description">{{ card.description }}</p>
    </div>
    <div class="card-field">
      <h3 class="field-label">{{ t('tarot.coreMeaning') }}</h3>
      <p class="core">{{ card.core_meaning }}</p>
    </div>
    <div v-if="card.meaning" class="card-field">
      <h3 class="field-label">{{ orientationLabel(card.orientation) }}</h3>
      <p class="core">{{ card.meaning }}</p>
    </div>
  </article>
</template>

<style scoped>
.card-block {
  padding: 1.35rem 1.25rem;
}
/* Contain the floated card art so the card grows with the text beside/below it. */
.card-block::after {
  content: '';
  display: block;
  clear: both;
}
.block-title {
  display: block;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 3px;
  color: var(--gold);
  margin: 0 0 0.5rem;
}
.card-art {
  position: relative;
  width: fit-content;
  max-width: 100%;
  margin: 0 auto 1.1rem;
  padding: 8px;
  border-radius: 16px;
  border: 1px solid rgba(201, 168, 76, 0.35);
  background: linear-gradient(160deg, rgba(201, 168, 76, 0.14), rgba(201, 168, 76, 0.02));
}
/* On wider screens the art floats so the text wraps beside and below it (no empty gap). */
@media (min-width: 560px) {
  .card-art {
    float: left;
    margin: 0.2rem 1.4rem 0.8rem 0;
  }
}
.card-art::before {
  content: '';
  position: absolute;
  inset: -18px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(201, 168, 76, 0.28), transparent 70%);
  z-index: -1;
  filter: blur(6px);
}
.card-image {
  display: block;
  width: 188px;
  max-width: 56vw;
  height: auto;
  border-radius: 10px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
  transition: transform 0.5s ease;
}
.reversed .card-image {
  transform: rotate(180deg);
}
.card-name {
  font-family: var(--font-body);
  font-size: 1.7rem;
  font-weight: 600;
  margin: 0 0 0.7rem;
  color: var(--text-primary);
  line-height: 1.15;
}
.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-bottom: 0.85rem;
}
.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.72rem;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  letter-spacing: 0.04em;
}
.badge.major {
  background: var(--gold-glow);
  border-color: rgba(201, 168, 76, 0.4);
  color: var(--gold-light);
}
.badge.minor {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
}
.badge.upright {
  background: rgba(127, 209, 174, 0.12);
  border-color: rgba(127, 209, 174, 0.35);
  color: #9fe0c6;
}
.badge.reversed-badge {
  background: rgba(232, 160, 160, 0.12);
  border-color: rgba(232, 160, 160, 0.35);
  color: #e8a0a0;
}
.badge-arrow {
  font-size: 0.85rem;
  line-height: 1;
}
.core {
  font-size: 1rem;
  line-height: 1.55;
  color: var(--text-secondary);
  margin: 0;
}
.keywords {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0 0 0.9rem;
  padding: 0;
}
.keyword-chip {
  font-size: 0.72rem;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  background: var(--gold-glow);
  color: var(--gold-light);
  letter-spacing: 0.02em;
  text-transform: capitalize;
}
.card-field {
  margin-bottom: 0.9rem;
}
.card-description {
  font-size: 1rem;
  line-height: 1.55;
  color: var(--text-muted);
  margin: 0;
}
.field-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--gold);
  margin: 0 0 0.4rem;
}
</style>
