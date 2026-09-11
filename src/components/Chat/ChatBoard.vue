<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useLoginUserStore } from '@/stores/loginUser'
import { message } from 'ant-design-vue'
import { Button as AButton } from 'ant-design-vue'
import { Textarea as ATextarea } from 'ant-design-vue'
import { queryChatHistoryByCursor } from '@/api/chatHistoryController'
import MessageRow from './MessageRow.vue'
import annoImg from '@/assets/anno.png'
import { API_BASE } from '@/config/api'
import { useStreaming } from '@/composables/useStreaming'
import {
  CloudUploadOutlined,
  ExperimentOutlined,
  AimOutlined,
  EditOutlined,
  QuestionOutlined,
  ArrowUpOutlined,
} from '@ant-design/icons-vue'

// ---------- types ----------
interface ChatMessage {
  uid: string
  sender: 'user' | 'ai'
  content: string
  avatarUrl: string
  createTime: string
  renderState: 'history' | 'loading' | 'streaming' | 'done'
  /** 仅新发送的消息为 true，用于播放渐显动画 */
  entering?: boolean
}

// ---------- props & state ----------
const props = defineProps<{
  appId: string
  /** 历史为空时自动作为第一条消息发送（创建应用流） */
  initialPrompt?: string
  /** 只读模式：禁用输入区（查看他人作品） */
  disabled?: boolean
  disabledTip?: string
}>()

const emit = defineEmits<{ streamComplete: [] }>()

const loginUserStore = useLoginUserStore()
const USER_AVATAR = computed(() => loginUserStore.loginUser.userAvatar || annoImg)
const AI_AVATAR = annoImg

const messages = ref<ChatMessage[]>([])
const userInput = ref('')
const isGenerating = ref(false)

// 输入模式占位（无实际逻辑）：edit=编辑，chat=对话
const chatMode = ref<'edit' | 'chat'>('edit')
const chatModeChecked = computed({
  get: () => chatMode.value === 'edit',
  set: (val: boolean) => {
    chatMode.value = val ? 'edit' : 'chat'
  },
})
const hasInput = computed(() => !!userInput.value.trim())
// 发送按钮可用性只看 textarea：只读场景由 prompt-card 遮罩拦截，不参与这里
const sendDisabled = computed(() => !hasInput.value || isGenerating.value)

// prompt-toolbar 三按钮（占位）：点击时弹一下
const promptTools = [
  { key: 'upload', label: '上传', icon: CloudUploadOutlined },
  { key: 'optimize', label: '优化', icon: ExperimentOutlined },
  { key: 'edit', label: '编辑', icon: AimOutlined },
]
const poppingIdx = ref(-1)

function triggerPop(idx: number) {
  // 先置 -1、下一帧再赋回，保证连续点击能重播动画
  poppingIdx.value = -1
  requestAnimationFrame(() => {
    poppingIdx.value = idx
  })
}

function endPop(e: AnimationEvent) {
  // 忽略子元素（如 antd wave）冒泡上来的 animationend
  if (e.target !== e.currentTarget) return
  poppingIdx.value = -1
}

const hasMore = ref(true)
const cursor = ref<string | undefined>(undefined)

// ---------- helpers ----------
async function fetchMessages(
  params: API.queryChatHistoryByCursorParams,
): Promise<API.ChatHistoryUserCursorPageVO | null> {
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
      avatarUrl: r.messageType === 'user' ? USER_AVATAR.value : AI_AVATAR,
      createTime: r.createTime || new Date().toISOString(),
      renderState: 'history',
    })
  })
  scrollToBottom()
}

onMounted(async () => {
  const historyCount = await loadHistory()
  // 创建应用流：历史为空时自动发送初始提示词
  if (historyCount === 0 && props.initialPrompt && !props.disabled) {
    sendMessage(props.initialPrompt)
  }
})

async function loadHistory(): Promise<number> {
  try {
    const data = await fetchMessages({
      appId: props.appId,
    })
    if (!data || !data.records?.length) {
      return 0
    }
    appendRecords(data.records)
    cursor.value = data.nextCursor
    hasMore.value = data.hasMore ?? true
    return data.records.length
  } catch {
    message.error('加载历史消息失败')
    return 0
  }
}

async function loadMore() {
  if (!hasMore.value || !cursor.value || isGenerating.value) return
  try {
    const data = await fetchMessages({
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
async function sendMessage(textArg?: string) {
  const text = (textArg ?? userInput.value).trim()
  if (!text || isGenerating.value || props.disabled) return

  // 1. Optimistically show user message
  messages.value.push({
    uid: crypto.randomUUID(),
    sender: 'user',
    content: text,
    avatarUrl: USER_AVATAR.value,
    createTime: new Date().toISOString(),
    renderState: 'done',
    entering: true,
  })

  // 2. Placeholder AI message — wrapped in reactive for reliable mutation tracking
  const aiMsg = reactive<ChatMessage>({
    uid: crypto.randomUUID(),
    sender: 'ai',
    content: '',
    avatarUrl: AI_AVATAR,
    createTime: new Date().toISOString(),
    renderState: 'loading',
    entering: true,
  })
  messages.value.push(aiMsg)

  userInput.value = ''
  isGenerating.value = true
  scrollToBottom()

  // 3. SSE streaming via composable
  const url = `${API_BASE}/apps/user/code-stream?appId=${props.appId}&userPrompt=${encodeURIComponent(text)}`
  const streamingFlag = ref(false)

  isGenerating.value = true
  streamingFlag.value = false

  const { startStream } = useStreaming({
    url,
    onData: (chunk) => {
      aiMsg.content += chunk
      if (aiMsg.renderState !== 'streaming') aiMsg.renderState = 'streaming'
      scrollToBottom()
    },
    onComplete: () => {
      isGenerating.value = false
      aiMsg.renderState = 'done'
      emit('streamComplete')
    },
    onError: (err) => {
      console.error('[ChatBoard] SSE error:', err)
      isGenerating.value = false
      aiMsg.content = '[连接错误，请稍后重试]'
      aiMsg.renderState = 'done'
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
        v-for="(msg, idx) in messages"
        :key="idx"
        :uid="msg.uid"
        :sender="msg.sender"
        :content="msg.content"
        :avatar-url="msg.avatarUrl"
        :create-time="msg.createTime"
        :render-state="msg.renderState"
        :class="{
          'msg-enter': msg.entering,
          'msg-enter-delayed': msg.entering && msg.sender === 'ai',
        }"
        @animationend="msg.entering = false"
      />
      <div v-if="!messages.length" class="empty-hint">暂无消息，开始对话吧</div>
    </div>

    <!-- Bottom: User Input -->
    <div class="user-prompt-area">
      <div class="prompt-card">
        <!-- div1: 无边框输入区，随内容向上扩张 -->
        <div class="prompt-input">
          <ATextarea
            v-model:value="userInput"
            placeholder="一个点子就够了～"
            :bordered="false"
            :auto-size="{ minRows: 2, maxRows: 6 }"
            :disabled="disabled || isGenerating"
            @keydown.enter.exact.prevent="sendMessage()"
          />
        </div>

        <!-- div2: 左侧占位工具 / 右侧模式开关 + 发送 -->
        <div class="prompt-toolbar">
          <div class="prompt-tools">
            <AButton
              v-for="(tool, idx) in promptTools"
              :key="tool.key"
              type="text"
              size="small"
              :class="{ 'btn-pop': poppingIdx === idx }"
              @click="triggerPop(idx)"
              @animationend="endPop"
            >
              <template #icon><component :is="tool.icon" /></template>
              {{ tool.label }}
            </AButton>
          </div>

          <div class="prompt-actions">
            <a-switch v-model:checked="chatModeChecked" size="small">
              <template #checkedChildren><EditOutlined /></template>
              <template #unCheckedChildren><QuestionOutlined /></template>
            </a-switch>
            <button
              class="send-btn"
              :class="{
                'is-edit': chatMode === 'edit',
                'is-chat': chatMode === 'chat',
                'is-idle': !hasInput,
              }"
              :disabled="sendDisabled"
              @click="sendMessage()"
            >
              <ArrowUpOutlined />
            </button>
          </div>
        </div>

        <!-- 只读（查看他人作品）：遮罩封住整卡 -->
        <div v-if="disabled" class="prompt-lock">{{ disabledTip }}</div>
      </div>
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
  padding: 0 16px;
}

.chat-board-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  /* 上下 24px 与渐隐高度一致：滚到底时最后一条消息恰好完整可读 */
  padding: 24px 16px;
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0,
    #000 24px,
    #000 calc(100% - 24px),
    transparent 100%
  );
  mask-image: linear-gradient(
    to bottom,
    transparent 0,
    #000 24px,
    #000 calc(100% - 24px),
    transparent 100%
  );
}

.empty-hint {
  text-align: center;
  color: #999;
  padding: 32px 0;
}

/* 新发送消息渐显：用户消息立即，AI 占位延迟 150ms 错峰出现 */
.msg-enter {
  animation: msg-fade-in 0.33s ease both;
}

/* 必须写在 .msg-enter 之后：animation 简写会把 animation-delay 重置为 0 */
.msg-enter-delayed {
  animation-delay: 0.225s;
}

@keyframes msg-fade-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.user-prompt-area {
  padding: 12px 16px;
}

/* 灰色卡片：上下两个无边框 div */
.prompt-card {
  position: relative;
  background: #f5f5f5;
  border-radius: 12px;
  padding: 0 5px 5px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 只读（查看他人作品）：半透明遮罩封住整卡，同时拦截交互 */
.prompt-lock {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.6);
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  cursor: not-allowed;
}

.prompt-input textarea {
  background: transparent;
  resize: none;
  padding: 5px 0 0 3px;
}

.prompt-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.prompt-tools {
  display: flex;
  align-items: center;
  gap: 5px;
}

/* 占位按钮：在 antd small 基础上再缩小 25%，间距由 .prompt-tools 的 gap 控制 */
.prompt-tools :deep(.ant-btn) {
  height: 18px;
  padding: 0;
  font-size: 10.5px;
  border-radius: 4px;
  color: rgba(0, 0, 0, 0.65);
  transition: color 0.2s;
}

/* 悬停/按下：icon 与文字变绿，并去掉 antd 自带的背景变色 */
.prompt-tools :deep(.ant-btn:hover),
.prompt-tools :deep(.ant-btn:active) {
  color: #00b894;
  background: transparent;
}

/* icon 与文字间距收窄到 2px */
.prompt-tools :deep(.ant-btn) > span {
  margin-inline-start: 2px;
}

/* 点击回弹：与按住时长无关，点一下必现 */
.prompt-tools :deep(.ant-btn.btn-pop) {
  animation: btn-pop 0.2s ease;
}

@keyframes btn-pop {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

.prompt-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 开关底色与发送按钮的模式色保持一致 */
.prompt-actions :deep(.ant-switch.ant-switch-checked),
.prompt-actions :deep(.ant-switch.ant-switch-checked:hover) {
  background: #00b894;
}

.prompt-actions :deep(.ant-switch:not(.ant-switch-checked)),
.prompt-actions :deep(.ant-switch:not(.ant-switch-checked):hover) {
  background: #595959;
}

/* 圆形发送按钮：底色 = 模式色 × 有无文本 */
.send-btn {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: #bfbfbf;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.send-btn.is-edit {
  background: #00b894;
}

.send-btn.is-chat {
  background: #595959;
}

/* 无文本：在模式色基础上变暗，规则靠后覆盖上面的模式色 */
.send-btn.is-edit.is-idle {
  background: #84d2bf;
}

.send-btn.is-chat.is-idle {
  background: #bfbfbf;
}

.send-btn:disabled {
  cursor: not-allowed;
}
</style>
