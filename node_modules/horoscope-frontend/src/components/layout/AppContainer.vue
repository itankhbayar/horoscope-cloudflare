<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    size?: 'md' | 'lg' | 'xl';
    padded?: boolean;
  }>(),
  {
    size: 'lg',
    padded: true,
  },
);
</script>

<template>
  <div class="app-container" :class="[size, { padded: props.padded }]">
    <slot />
  </div>
</template>

<style scoped>
.app-container {
  width: 100%;
  margin: 0 auto;
}
.app-container.md {
  max-width: 820px;
}
.app-container.lg {
  max-width: 980px;
}
.app-container.xl {
  max-width: 1120px;
}
.app-container.padded {
  padding-inline: clamp(0.75rem, 2.8vw, 1.5rem);
  padding-bottom: calc(3rem + env(safe-area-inset-bottom));
}
</style>
