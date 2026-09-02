<script setup lang="ts">
defineProps<{
  sender: 'user' | 'ai'
  content: string
  avatarUrl: string
}>()
</script>

<template>
  <div class="message-row" :class="'message-row-' + sender">
    <!-- 左列头像 -->
    <div v-if="sender === 'user'" class="avatar">
      <img :src="avatarUrl" />
    </div>
    <div v-else class="avatar avatar-empty"></div>

    <!-- 中间气泡 -->
    <div class="message-bubble">
      <div class="bubble-content">{{ content }}</div>
    </div>

    <!-- 右列头像 -->
    <div v-if="sender === 'ai'" class="avatar">
      <img :src="avatarUrl" />
    </div>
    <div v-else class="avatar avatar-empty"></div>
  </div>
</template>

<style>
@import '@/styles/chat.css';
</style>
