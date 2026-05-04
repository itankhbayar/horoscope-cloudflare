<script setup lang="ts">
withDefaults(
  defineProps<{
    card?: boolean;
  }>(),
  {
    card: false,
  },
);
</script>

<template>
  <section :class="{ 'glass-card': card }">
    <slot />
  </section>
</template>
