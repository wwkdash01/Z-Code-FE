<script setup lang="ts">
import { computed } from 'vue'
import { ref } from 'vue'
import defaultAvatar from '@/assets/anno.png'
import { renderMarkdown } from '@/utils/markdown'

const props = defineProps<{
  sender: 'user' | 'ai'
  content: string
  avatarUrl: string
  renderState?: 'history' | 'loading' | 'streaming' | 'done'
  asMarkdown?: boolean
}>()

const avatarFailed = ref(false)

// Markdown HTML — null means plain text display (safe during streaming)
const html = computed(() => props.asMarkdown ? renderMarkdown(props.content) : null)
</script>

<template>
  <div class="msg-row" :class="'sender-' + sender">
    <!-- Left avatar -->
    <div v-if="sender === 'user'" class="av-left">
      <img :src="avatarFailed || !avatarUrl ? defaultAvatar : avatarUrl" />
    </div>
    <div v-else class="sp"></div>

    <!-- Bubble container -->
    <div class="bub-wrap" :class="sender">
      <!-- AI loading: dots -->
      <div v-if="sender === 'ai' && renderState === 'loading'" class="bb bub-loading">
        <span class="di-dot"></span>
        <span class="di-dot"></span>
        <span class="di-dot"></span>
      </div>
      <!-- AI streaming: plain text only (avoids unbalanced HTML) -->
      <div v-else-if="sender === 'ai' && renderState === 'streaming'" class="bb bub-stream">
        {{ content }}<span class="t-cursor">|</span>
      </div>
      <!-- AI done / history -->
      <div v-else-if="sender === 'ai'" class="bb" :class="{ 'has-md': html }" v-html="html || content"></div>
      <!-- User message -->
      <div v-else class="bb">{{ content }}</div>
    </div>

    <!-- Right avatar -->
    <div v-if="sender === 'ai'" class="av-right">
      <img :src="avatarFailed || !avatarUrl ? defaultAvatar : avatarUrl" />
    </div>
    <div v-else class="sp"></div>
  </div>
</template>

<style scoped>
.msg-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.av-left,
.av-right,
.sp {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}

.av-left img,
.av-right img {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  object-fit: cover;
}

/* ===== bubble wrapper: controls alignment within the middle column ===== */
.bub-wrap {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
}

.bub-wrap.user {
  justify-content: flex-start;
}

.bub-wrap.ai {
  justify-content: flex-end;
}

/* ===== the bubble itself: shrink-to-fit, max 90% of middle col ===== */
.bb {
  padding: 8px 10px 10px;
  border-radius: 12px;
  font-size: 15px;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  word-break: break-word;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  width: fit-content;
}

/* AI messages: gray, right-aligned */
.sender-ai .bb {
  background-color: #f0f0f0;
  color: rgba(0, 0, 0, 0.88);
  max-width: 90%;
}

.bb.bub-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 10px;
  background-color: #f0f0f0;
  width: fit-content;
  max-width: none;
}

.di-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #bfbfbf;
  animation: di-bounce 1.4s infinite ease-in-out;
}
.di-dot:nth-child(1) { animation-delay: -0.32s; }
.di-dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes di-bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

.bb.bub-stream {
  max-width: 90%;
}

/* Markdown rendered inside .bb via :deep selectors */
.bb.has-md :deep(h1) { font-size: 1.5rem; margin: 0.5rem 0; }
.bb.has-md :deep(h2) { font-size: 1.25rem; margin: 0.5rem 0; }
.bb.has-md :deep(h3) { font-size: 1.1rem; margin: 0.5rem 0; }
.bb.has-md :deep(p) { margin: 0.5rem 0; }
.bb.has-md :deep(ul),
.bb.has-md :deep(ol) { padding-left: 1.5rem; margin: 0.5rem 0; }
.bb.has-md :deep(a) { color: #0969da; text-decoration: none; }
.bb.has-md :deep(a:hover) { text-decoration: underline; }
.bb.has-md :deep(pre) { overflow-x: auto; }
.bb.has-md :deep(.vscode-code-block) {
  margin: 0.5rem 0; position: relative; background: #1e1e1e; border-radius: 8px; overflow: hidden; display: block;
}
.bb.has-md :deep(.vscode-header) {
  background: #2d2d2d; color: #999; padding: 4px 14px; font-size: 12px; user-select: none;
}
.bb.has-md :deep(.vscode-code-block pre) {
  max-height: 320px; overflow: auto !important; margin: 0; padding: 12px 16px; scrollbar-width: thin; scrollbar-color: #555 #1e1e1e;
}
.bb.has-md :deep(.vscode-code-block code) {
  font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 13px; white-space: pre; color: #d4d4d4;
}
.bb.has-md :deep(.copy-btn) {
  position: absolute; top: 8px; right: 12px; background: #3c3c3c; color: #ccc; border: none; padding: 3px 12px; border-radius: 4px; font-size: 12px; cursor: pointer; opacity: 0; transition: opacity 0.2s;
}
.bb.has-md :deep(.vscode-code-block:hover .copy-btn) { opacity: 1; }
.bb.has-md :deep(.copy-btn:hover) { background: #505050; color: #fff; }

.t-cursor {
  color: #00b894;
  animation: tblink 1s infinite;
}

@keyframes tblink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* User messages: teal, left-aligned */
.sender-user .bb {
  background-color: #00b894;
  color: #fff;
  max-width: 90%;
}
</style>
