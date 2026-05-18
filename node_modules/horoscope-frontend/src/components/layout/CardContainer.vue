<template>
  <div class="glass-card card-container">
    <slot />
  </div>
</template>

<style scoped>
.card-container {
  padding: clamp(1rem, 2vw, 1.6rem);
}
</style>
