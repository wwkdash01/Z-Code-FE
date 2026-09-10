<script setup lang="ts">
import { ref, onMounted, type ShallowRef } from 'vue'
import { useLoginUserStore } from '@/stores/loginUser'
import { message } from 'ant-design-vue'
import { Button as AButton } from 'ant-design-vue'
import { Textarea as ATextarea } from 'ant-design-vue'
import { queryChatHistoryByCursor } from '@/api/chatHistoryController'
import MessageRow from './MessageRow.vue'
import { useStreaming } from '@/composables/useStreaming'
import annoImg from '@/assets/anno.png'
import { API_BASE } from '@/config/api'

// ---------- types ----------
interface ChatMessage {
  uid: string
  sender: 'user' | 'ai'
  content: string
  avatarUrl: string
  renderState: 'history' | 'loading' | 'streaming' | 'done'
}

// ---------- state ----------
const props = defineProps<{ appId: string }>()

const loginUserStore = useLoginUserStore()
const USER_AVATAR = loginUserStore.loginUser.value?.userAvatar || annoImg
const AI_AVATAR = annoImg

/** Each element is a shallow ref — Vue tracks property mutations reliably */
const messages = ref<ShallowRef<ChatMessage>[]>([])
const userInput = ref('')
const hasMore = ref(true)
const cursor = ref<string | undefined>(undefined)

/** Index of the currently streaming AI message (0-based in messages array) */
let currentAiMsgIdx = -1

// ---------- helpers ----------
async function fetchMessages<T>(params: Record<string, any>): Promise<T | null> {
  const res = await queryChatHistoryByCursor(params)
  if (res.data.code !== 200 || !res.data.data) return null
  return res.data.data
}

function appendRecords(records: API.ChatHistoryVO[]) {
  records.forEach((r) => {
    messages.value.unshift(shallowRef({
      uid: crypto.randomUUID(),
      sender: r.messageType === 'user' ? 'user' : 'ai',
      content: r.message || '',
      avatarUrl: r.messageType === 'user' ? USER_AVATAR : AI_AVATAR,
      renderState: 'history',
    }))
  })
  scrollToBottom()
}

onMounted(async () => {
  await loadHistory()
})

async function loadHistory() {
  try {
    const data = await fetchMessages<API.ChatHistoryUserCursorPageVO>({
      appId: props.appId,
    })
    if (!data || !data.records?.length) {
      message.info('暂无聊天记录')
      return
    }
    appendRecords(data.records)
    cursor.value = data.nextCursor
    hasMore.value = data.hasMore ?? true
  } catch {
    message.error('加载历史消息失败')
  }
}

async function loadMore() {
  if (!hasMore.value || !cursor.value) return
  try {
    const data = await fetchMessages<API.ChatHistoryUserCursorPageVO>({
      appId: props.appId,
      cursor: cursor.value,
    })
    if (!data) return
    appendRecords(data.records || [])
    cursor.value = data.nextCursor
    hasMore.value = data.hasMore ?? true
  } catch {
    message.error('加载更多失败')
  }
}

// ---------- send message (SSE via useStreaming composable) ----------
function sendMessage() {
  const text = userInput.value.trim()
  if (!text || currentAiMsgIdx >= 0) return

  // 1. User message
  messages.value.push(shallowRef({
    uid: crypto.randomUUID(),
    sender: 'user',
    content: text,
    avatarUrl: USER_AVATAR,
    renderState: 'done',
  }))

  // 2. AI placeholder — record index for direct mutation
  messages.value.push(shallowRef({
    uid: crypto.randomUUID(),
    sender: 'ai',
    content: '',
    avatarUrl: AI_AVATAR,
    renderState: 'loading',
  }))
  currentAiMsgIdx = messages.value.length - 1

  userInput.value = ''
  scrollToBottom()

  // 3. SSE streaming via composable
  const url = `${API_BASE}/apps/user/code-stream?appId=${props.appId}&userPrompt=${encodeURIComponent(text)}`

  const { startStream } = useStreaming({
    url,
    onData: (chunk) => {
      if (currentAiMsgIdx < 0) return
      const msg = messages.value[currentAiMsgIdx]
      msg.value.content += chunk
      if (msg.value.renderState !== 'streaming') {
        msg.value.renderState = 'streaming'
      }
      scrollToBottom()
    },
    onComplete: () => {
      if (currentAiMsgIdx < 0) return
      messages.value[currentAiMsgIdx].value.renderState = 'done'
      currentAiMsgIdx = -1
    },
    onError: (err) => {
      console.error('[ChatBoard] SSE error:', err)
      if (currentAiMsgIdx < 0) return
      messages.value[currentAiMsgIdx].value.content = '[连接错误，请稍后重试]'
      messages.value[currentAiMsgIdx].value.renderState = 'done'
      currentAiMsgIdx = -1
      message.error('AI 响应失败')
    },
  })

  startStream()
}

// ---------- scroll (throttled via RAF cancel) ----------
let scrollRafId = 0
function scrollToBottom() {
  cancelAnimationFrame(scrollRafId)
  scrollRafId = requestAnimationFrame(() => {
    const container = document.querySelector('.chat-board-content')
    if (container) container.scrollTop = container.scrollHeight
  })
}

// ---------- key helper for v-for (index-based, efficient) ----------
function getMsgKey(msg: ShallowRef<ChatMessage>, idx: number): string {
  return msg.value.uid || String(idx)
}

</script>

<template>
  <div class="chat-board-wrapper">
    <!-- Top: Load More History -->
    <div class="chat-board-header">
      <AButton
        v-if="hasMore"
        type="link"
        size="small"
        @click="loadMore"
        :disabled="currentAiMsgIdx >= 0"
      >
        加载更多历史
      </AButton>
    </div>

    <!-- Middle: Messages -->
    <div class="chat-board-content">
      <MessageRow
        v-for="(msg, idx) in messages"
        :key="getMsgKey(msg, idx)"
        :sender="msg.sender"
        :content="msg.content"
        :avatar-url="msg.avatarUrl"
        :render-state="msg.renderState"
        :as-markdown="msg.sender === 'ai'"
      />
      <div v-if="!messages.length" class="empty-hint">暂无消息，开始对话吧</div>
    </div>

    <!-- Bottom: User Input -->
    <div class="user-prompt-area">
      <ATextarea
        v-model:value="userInput"
        placeholder="请输入消息..."
        :auto-size="{ minRows: 1, maxRows: 6 }"
        :disabled="currentAiMsgIdx >= 0"
        @keydown.enter.exact.prevent="sendMessage"
      />
      <AButton
        type="primary"
        :disabled="!userInput.trim() || currentAiMsgIdx >= 0"
        @click="sendMessage"
      >
        发送
      </AButton>
    </div>
  </div>
</template>

<style scoped>
.chat-board-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.chat-board-header {
  padding: 8px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.chat-board-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.empty-hint {
  text-align: center;
  color: #999;
  padding: 32px 0;
}

.user-prompt-area {
  padding: 12px 16px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;
}

.user-prompt-area textarea {
  resize: none;
}
</style>
