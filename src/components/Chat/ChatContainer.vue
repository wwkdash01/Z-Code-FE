<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import MessageRow from './MessageRow.vue'
import annoImg from '@/assets/anno.png'

const props = defineProps<{
  userMessage: string
  aiResponse: string
  isGenerating: boolean
  userAvatarUrl: string
}>()

const AI_AVATAR = annoImg

const messageListRef = ref<HTMLElement | null>(null)

function scrollToBottom() {
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }
}

watch(
  () => [props.userMessage, props.aiResponse, props.isGenerating],
  () => {
    scrollToBottom()
  },
  { immediate: true }
)

onMounted(() => {
  scrollToBottom()
})
</script>

<template>
  <div class="chat-container">
    <div ref="messageListRef" class="message-list">
      <!-- 用户消息 -->
      <MessageRow
        v-if="userMessage"
        sender="user"
        :content="userMessage"
        :avatar-url="userAvatarUrl"
      />

      <!-- 生成中（无内容） -->
      <div v-if="isGenerating && !aiResponse" class="message-row message-row-ai">
        <div class="avatar avatar-empty"></div>
        <div class="message-bubble">
          <div class="typing-indicator">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
        <div class="avatar avatar-empty"></div>
      </div>

      <!-- AI 回复 -->
      <MessageRow
        v-if="aiResponse"
        sender="ai"
        :content="aiResponse"
        :avatar-url="AI_AVATAR"
      />
    </div>
  </div>
</template>

<style>
@import '@/styles/chat.css';
</style>
