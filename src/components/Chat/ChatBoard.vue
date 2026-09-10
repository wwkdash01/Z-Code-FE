<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useLoginUserStore } from '@/stores/loginUser'
import { message } from 'ant-design-vue'
import { Button as AButton } from 'ant-design-vue'
import { Textarea as ATextarea } from 'ant-design-vue'
import { queryChatHistoryByCursor } from '@/api/chatHistoryController'
import MessageRow from './MessageRow.vue'
import { fetchEventSource } from '@microsoft/fetch-event-source'
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

// ---------- props & state ----------
const props = defineProps<{ appId: string }>()

const loginUserStore = useLoginUserStore()
const USER_AVATAR = loginUserStore.loginUser.value?.userAvatar || annoImg
const AI_AVATAR = annoImg

const messages = ref<ChatMessage[]>([])
const userInput = ref('')
const isGenerating = ref(false)
const hasMore = ref(true)
const cursor = ref<string | undefined>(undefined)

// ---------- helpers ----------
async function fetchMessages<T>(params: Record<string, any>): Promise<T | null> {
  const res = await queryChatHistoryByCursor(params)
  if (Number(res.data.code) !== 200 || !res.data.data) {
    return null
  }
  return res.data.data
}

// ---------- history loading ----------
function appendRecords(records: API.ChatHistoryVO[]) {
  records.forEach((r) => {
    messages.value.unshift({
      uid: crypto.randomUUID(),
      sender: r.messageType === 'user' ? 'user' : 'ai',
      content: r.message || '',
      avatarUrl: r.messageType === 'user' ? USER_AVATAR : AI_AVATAR,
      renderState: 'history',
    })
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
  if (!hasMore.value || !cursor.value || isGenerating.value) return
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

// ---------- send message (SSE) ----------
async function sendMessage() {
  const text = userInput.value.trim()
  if (!text || isGenerating.value) return

  // 1. Optimistically show user message
  messages.value.push({
    uid: crypto.randomUUID(),
    sender: 'user',
    content: text,
    avatarUrl: USER_AVATAR,
    renderState: 'done',
  })

  // 2. Placeholder AI message — wrapped in reactive for reliable mutation tracking
  const aiMsg = reactive<ChatMessage>({
    uid: crypto.randomUUID(),
    sender: 'ai',
    content: '',
    avatarUrl: AI_AVATAR,
    renderState: 'loading',
  })
  messages.value.push(aiMsg)

  userInput.value = ''
  isGenerating.value = true
  scrollToBottom()

  // 3. SSE streaming
  const url = `${API_BASE}/apps/user/code-stream?appId=${props.appId}&userPrompt=${encodeURIComponent(text)}`

  try {
    await fetchEventSource(url, {
      credentials: 'include',
      onmessage(event) {
        try {
          const parsed = JSON.parse(event.data)
          aiMsg.content += parsed.d || parsed.data || parsed.content || ''
        } catch {
          aiMsg.content += event.data
        }
        if (aiMsg.renderState !== 'streaming') {
          aiMsg.renderState = 'streaming'
        }
        scrollToBottom()
      },
      onerror(err) {
        console.error('[ChatBoard] SSE error:', err)
        aiMsg.content = '[连接错误，请稍后重试]'
        aiMsg.renderState = 'done'
        message.error('AI 响应失败')
      },
    })
    // Stream completed successfully
    aiMsg.renderState = 'done'
  } catch (err) {
    console.error('[ChatBoard] SSE error:', err)
    aiMsg.content = '[连接错误，请稍后重试]'
    aiMsg.renderState = 'done'
    message.error('AI 响应失败')
  } finally {
    isGenerating.value = false
  }
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
        :disabled="isGenerating"
      >
        加载更多历史
      </AButton>
    </div>

    <!-- Middle: Messages -->
    <div class="chat-board-content">
      <MessageRow
        v-for="msg in messages"
        :key="msg.uid"
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
        :disabled="isGenerating"
        @keydown.enter.exact.prevent="sendMessage"
      />
      <AButton
        type="primary"
        :disabled="!userInput.trim() || isGenerating"
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
