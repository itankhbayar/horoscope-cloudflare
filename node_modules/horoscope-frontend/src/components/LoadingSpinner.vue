<script setup lang="ts">
defineProps<{ label?: string }>();
</script>

<template>
  <div class="loading">
    <span class="spinner">✨</span>
    <span v-if="label" class="label">{{ label }}</span>
  </div>
</template>

<style scoped>
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.7rem;
  padding: 1.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}
.spinner {
  display: inline-block;
  font-size: 1.4rem;
  color: var(--gold);
  animation: spin 2.5s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.label { letter-spacing: 0.5px; }
</style>
