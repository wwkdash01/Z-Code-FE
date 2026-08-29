<script setup lang="ts">
import BasicLayout from '@/layouts/BasicLayout.vue'
import { useLoginUserStore } from './stores/loginUser';
import '@/access';

const loginUserStore = useLoginUserStore();
loginUserStore.fetchLoginUser();
</script>

<template>
  <BasicLayout />

</template>

<style scoped>
.test-btn {
  position: fixed;
  top: 68px;
  right: 24px;
  z-index: 50;
}
</style>
