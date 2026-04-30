<script setup lang="ts">
defineProps<{
  title: string;
  body: string;
  icon?: string;
  accent?: string;
}>();
</script>

<template>
  <article class="prediction-card glass-card">
    <header>
      <span v-if="icon" class="icon" :style="accent ? { color: accent } : {}">{{ icon }}</span>
      <h3>{{ title }}</h3>
    </header>
    <p>{{ body }}</p>
  </article>
</template>

<style scoped>
.prediction-card {
  padding: 1.4rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}
header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.icon { font-size: 1.4rem; color: var(--gold); }
h3 {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}
p {
  font-size: 0.95rem;
  line-height: 1.7;
  color: var(--text-secondary);
}
</style>
