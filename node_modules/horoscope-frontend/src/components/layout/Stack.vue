<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    gap?: 'sm' | 'md' | 'lg';
  }>(),
  {
    gap: 'md',
  },
);
</script>

<template>
  <div class="stack" :class="props.gap">
    <slot />
  </div>
</template>

<style scoped>
.stack {
  display: flex;
  flex-direction: column;
}
.stack.sm {
  gap: 0.75rem;
}
.stack.md {
  gap: 1rem;
}
.stack.lg {
  gap: 1.5rem;
}
</style>
