<script setup lang="ts">
const footerText = 'wwk z-code platform by wwk'
</script>

<template>
  <a-layout-footer class="global-footer">
    <span>{{ footerText }}</span>
  </a-layout-footer>
</template>

<style scoped>
.global-footer {
  position: sticky;
  align-items: center;
  justify-content: center;
  height: 8vh;
  padding: 0 24px;
  color: var(--color-text-tertiary);
  font-size: 14px;
  text-align: center;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
}
</style>
