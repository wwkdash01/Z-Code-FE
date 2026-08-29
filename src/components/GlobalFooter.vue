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
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  padding: 0 24px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 14px;
  text-align: center;
  background: #fff;
  border-top: 1px solid #f0f0f0;
}
</style>
