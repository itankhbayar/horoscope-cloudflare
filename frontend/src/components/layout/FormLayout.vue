<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    columns?: 1 | 2;
  }>(),
  {
    columns: 1,
  },
);
</script>

<template>
  <div class="form-layout" :class="`cols-${props.columns}`">
    <slot />
  </div>
</template>

<style scoped>
.form-layout {
  display: grid;
  gap: 1rem;
}
.form-layout.cols-2 {
  grid-template-columns: 1fr;
}
@media (min-width: 640px) {
  .form-layout.cols-2 {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
