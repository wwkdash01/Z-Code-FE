<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import GlobalHeader from '@/components/GlobalHeader.vue'
import GlobalFooter from '@/components/GlobalFooter.vue'

const route = useRoute()
const isBlank = computed(() => route.meta.blank === true)
</script>

<template>

  <a-layout class="basic-layout" :class="{ 'basic-layout--blank': isBlank }">

    <GlobalHeader v-if="!isBlank" />

    <a-layout-content
      class="basic-layout__content"
      :class="{ 'basic-layout__content--blank': isBlank }"
    >
      <router-view />
    </a-layout-content>

    <GlobalFooter v-if="!isBlank" />

  </a-layout>

</template>

<style scoped>

.basic-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.basic-layout--blank {
  min-height: 0;
  height: 100vh;
  overflow: hidden;
}

.basic-layout__content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  /* 页面主底色 #FAF9F6（与 ConfigProvider 的 colorBgLayout 同值） */
  background: var(--color-page-bg);
}

.basic-layout__content--blank {
  padding: 0;
  background: var(--color-surface);
  overflow: hidden;
}
</style>
