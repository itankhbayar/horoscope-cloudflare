<template>
  <div class="screen-layout">
    <slot />
  </div>
</template>

<style scoped>
.screen-layout {
  display: flex;
  flex-direction: column;
  gap: clamp(1rem, 2vw, 1.75rem);
  padding-top: clamp(1rem, 2.5vw, 2rem);
}
</style>
