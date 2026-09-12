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
  CaretUpOutlined,
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
  // 点击动画跑在图标（子元素）上，所以不能用 target === currentTarget 过滤。
  // 改用动画名识别本次动作，忽略 antd wave 等其它冒泡上来的 animationend。
  // scoped 样式会给 keyframes 名加作用域后缀（tool-tap-xxxxxx），故用前缀匹配。
  if (!e.animationName.startsWith('tool-tap')) return
  poppingIdx.value = -1
}

/** 发送键箭头动画：仅用户主动提交时置 true，初始化自动发送不播 */
const sendingAnim = ref(false)

function endSendFly(e: AnimationEvent) {
  // 同 endPop：动画跑在图标（子元素）上，且 scoped 会给 keyframes 名加作用域后缀，故前缀匹配
  if (!e.animationName.startsWith('send-fly')) return
  sendingAnim.value = false
}

/** 只认本行自己的渐显动画：子元素冒泡上来的 animationend 会提前清掉标记 */
function handleRowAnimationEnd(e: AnimationEvent, msg: ChatMessage) {
  if (e.target !== e.currentTarget) return
  msg.entering = false
}

const hasMore = ref(false)
/** 加载中的互斥标记：cursor 要等响应回来才推进，缺了它同一游标会被连点请求多次 */
const loadingMore = ref(false)
/** 点击反馈动画时长，同时作为「反馈至少显示这么久」的下限 */
const FEEDBACK_MS = 400
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
}

onMounted(async () => {
  const historyCount = await loadHistory()
  // 创建应用流：历史为空时自动发送初始提示词
  if (historyCount === 0 && props.initialPrompt && !props.disabled) {
    sendMessage(props.initialPrompt, { animate: false })
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
    applyViewport('bottom')
    return data.records.length
  } catch {
    message.error('加载历史消息失败')
    return 0
  }
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value || !cursor.value || isGenerating.value) return
  loadingMore.value = true
  try {
    const anchor = captureAnchor()
    // 后端可能几十毫秒就返回，这一步保证反馈动画至少播完；
    // 若请求更慢，则锁定一直持续到数据到位——正确性不依赖后端有多快
    const [data] = await Promise.all([
      fetchMessages({
        appId: props.appId,
        cursor: cursor.value,
      }),
      new Promise((resolve) => setTimeout(resolve, FEEDBACK_MS)),
    ])
    if (!data) return
    appendRecords(data.records || [])
    cursor.value = data.nextCursor
    hasMore.value = data.hasMore ?? true
    applyViewport('preserve', anchor)
  } catch {
    message.error('加载更多失败')
  } finally {
    loadingMore.value = false
  }
}

// ---------- send message (SSE) ----------
async function sendMessage(textArg?: string, opts: { animate: boolean } = { animate: true }) {
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
  sendingAnim.value = opts.animate
  applyViewport('bottom')

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
      applyViewport('follow')
    },
    onComplete: () => {
      isGenerating.value = false
      aiMsg.renderState = 'done'
      // 时间戳这时才出现，该行会变高，贴底时补一次跟随
      applyViewport('follow')
      emit('streamComplete')
    },
    onError: (err) => {
      console.error('[ChatBoard] SSE error:', err)
      isGenerating.value = false
      aiMsg.content = '[连接错误，请稍后重试]'
      aiMsg.renderState = 'done'
      applyViewport('follow')
      message.error('AI 响应失败')
    },
  })

  startStream()
}

// ---------- viewport (throttled via RAF cancel) ----------
type ViewportPolicy = 'bottom' | 'preserve' | 'follow'
/** 距底部 8px 以内视为贴底 */
const BOTTOM_EPS = 8

const scroller = ref<HTMLElement | null>(null)
let scrollRafId = 0
/**
 * 用户当前是否贴底。只能由滚动事件维护：流式期间内容持续变高，
 * 若在每次变更前现算，同一帧内到达第二个 chunk 时会因为「上一次的滚动还没补上」而误判为已离开底部。
 */
const pinnedToBottom = ref(true)

function onScrollerScroll() {
  const el = scroller.value
  if (!el) return
  pinnedToBottom.value = el.scrollTop + el.clientHeight >= el.scrollHeight - BOTTOM_EPS
}

/**
 * 仅 'preserve' 需要：记住变更前第一行在容器内的偏移。
 * 用某一行的实际位移而不是 scrollHeight 差值，是因为后者会被原生滚动锚定、
 * 容器尺寸变化、以及内容不足一屏时 scrollHeight 被 clientHeight 夹住这三种情况污染；
 * 而行的位移在「浏览器已自动补偿」时自然为 0，在「未补偿」时正好等于插入高度，两种情况都无需额外判断。
 */
function captureAnchor() {
  const el = scroller.value
  const row = el?.firstElementChild as HTMLElement | null
  if (!el || !row) return null
  return { row, offset: row.getBoundingClientRect().top - el.getBoundingClientRect().top }
}

/** 列表变更之后调用；rAF 晚于 Vue 的 DOM patch，且能把同帧的多次调用合并成一次写入 */
function applyViewport(
  policy: ViewportPolicy,
  anchor: ReturnType<typeof captureAnchor> = null,
) {
  cancelAnimationFrame(scrollRafId)
  scrollRafId = requestAnimationFrame(() => {
    const el = scroller.value
    if (!el) return
    if (policy === 'bottom') {
      el.scrollTop = el.scrollHeight
    } else if (policy === 'preserve') {
      if (!anchor || !anchor.row.isConnected) return
      const now = anchor.row.getBoundingClientRect().top - el.getBoundingClientRect().top
      el.scrollTop += now - anchor.offset
    } else if (pinnedToBottom.value) {
      el.scrollTop = el.scrollHeight
    }
  })
}

</script>

<template>
  <div class="chat-board-wrapper">
    <!-- Top: Load More History -->
    <div class="chat-board-header">
      <button
        type="button"
        class="load-more-divider"
        :class="{ 'is-hidden': !hasMore, 'is-loading': loadingMore }"
        :style="{ '--feedback-ms': FEEDBACK_MS + 'ms' }"
        :disabled="isGenerating || !hasMore || loadingMore"
        @click="loadMore"
      >
        加载更多历史
      </button>
    </div>

    <!-- Middle: Messages -->
    <div ref="scroller" class="chat-board-content" @scroll.passive="onScrollerScroll">
      <MessageRow
        v-for="msg in messages"
        :key="msg.uid"
        :sender="msg.sender"
        :content="msg.content"
        :avatar-url="msg.avatarUrl"
        :create-time="msg.createTime"
        :render-state="msg.renderState"
        :class="{
          'msg-enter': msg.entering,
          'msg-enter-delayed': msg.entering && msg.sender === 'ai',
        }"
        @animationend="handleRowAnimationEnd($event, msg)"
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
              :class="[`tool-${tool.key}`, { 'tool-tapped': poppingIdx === idx }]"
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
                'sending': sendingAnim,
              }"
              :disabled="sendDisabled"
              @click="sendMessage()"
              @animationend="endSendFly"
            >
              <CaretUpOutlined />
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

/* 「---- 查看更多 ----」式分隔条：两侧横线用 currentColor，随文字一起变灰/变绿 */
.load-more-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 3px 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 12px;
  line-height: 1;
  opacity: 0.5;
  color: rgba(0, 0, 0, 0.45);
  cursor: pointer;
  transition: color 0.4s, opacity 0.4s;
}

/* max-width 控制单侧横线长度：横线不再撑满容器 */
.load-more-divider::before,
.load-more-divider::after {
  content: '';
  flex: 1;
  max-width: 60px;
  height: 1px;
  background: currentColor;
}

/* 横线向文字方向收拢：只动 transform，不碰 max-width，无布局回流 */
.load-more-divider::before {
  transform-origin: right center;
}

.load-more-divider::after {
  transform-origin: left center;
}

/* 点击：横线先收缩再展开，恰好占满反馈下限，随后由呼吸接管 */
.load-more-divider.is-loading::before,
.load-more-divider.is-loading::after {
  animation: lm-retract var(--feedback-ms, 400ms) ease;
}

@keyframes lm-retract {
  0% {
    transform: scaleX(1);
  }
  50% {
    transform: scaleX(0.3);
  }
  100% {
    transform: scaleX(1);
  }
}

/* 收缩播完仍未返回时整体呼吸，盖住等待尾巴；请求更慢也不会解锁按钮 */
.load-more-divider.is-loading {
  animation: lm-breath 1.1s ease-in-out var(--feedback-ms, 400ms) infinite;
}

@keyframes lm-breath {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

.load-more-divider:not(:disabled):hover {
  opacity: 1;
  color: #00b894;
}

.load-more-divider:disabled {
  cursor: not-allowed;
}

/* 始终占位：hasMore 变 false 时只隐藏不摘除，否则 header 塌陷会让内容区整体上移 */
.load-more-divider.is-hidden {
  visibility: hidden;
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
  gap: 8px;
  /* 补回原先由图标前导 margin 顺带提供的左内缩，保持工具条左端位置不变 */
  padding-left: 2px;
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

/* icon 与文字间距：必须用 .anticon + span 只命中文字。
   antd 会把文字包进 <span>，图标的 <span class="anticon"> 是它的兄弟，
   写 `> span` 会连图标一起命中——那份额外内缩还会计进按钮之间的视觉间距 */
.prompt-tools :deep(.ant-btn > .anticon + span) {
  margin-inline-start: 3px;
}

/* 点击反馈：只动图标，文字保持不动；无回弹，幅度小。
   变量挂在按钮上，由 .anticon 继承后在 keyframe 里取值 */
.prompt-tools :deep(.ant-btn.tool-tapped .anticon) {
  animation: tool-tap 0.28s ease-out;
}

.prompt-tools :deep(.ant-btn.tool-upload) {
  --tap-y: -2px;
}

.prompt-tools :deep(.ant-btn.tool-optimize) {
  --tap-r: -14deg;
}

.prompt-tools :deep(.ant-btn.tool-edit) {
  --tap-y: -1px;
  --tap-r: 9deg;
}

@keyframes tool-tap {
  0% {
    transform: none;
  }
  45% {
    transform: translateY(var(--tap-y, 0)) rotate(var(--tap-r, 0deg));
  }
  100% {
    transform: none;
  }
}

/* 会用 transform 做动画的图标统一常驻合成层：否则动画一结束层被回收，图标回到父层
   按小数布局坐标重新取整，会横向跳 1px（表现为「静止偏右、动画期间正常」） */
.prompt-tools :deep(.ant-btn .anticon),
.send-btn :deep(.anticon) {
  will-change: transform;
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
  /* 悬停时箭头抬起的高度，同时是 send-fly 的起始帧：两处共用一个值，衔接处恒等 */
  --fly-lift: -22%;
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
  /* 裁出圆形：箭头「飞出」靠它，越出圆心的部分才不可见 */
  overflow: hidden;
}

/* 悬停：箭头抬起「准备起飞」并停住。用 transition 而非 animation：可中断、可逆，
   指针移开时从当前值平滑落回 */
/* 悬停抬起/落回走 transition：可中断、可逆，指针移开时从当前值平滑落回 */
.send-btn :deep(.anticon) {
  transition: transform 0.2s ease-out;
}

/* :not(:disabled) 是必需的：发送期间按钮 disabled，悬停整体失效，
   飞行动画结束后图标才不会被悬停值再拽起来 */
.send-btn:not(:disabled):hover :deep(.anticon) {
  transform: translateY(var(--fly-lift));
}

/* 用户主动提交：箭头从抬起处向上飞出圆形，再从下方升回圆心 */
.send-btn.sending :deep(.anticon) {
  animation: send-fly 0.9s ease-in-out;
}

/* 0% 接住悬停终态；100% 回 0（发送后按钮 disabled，静止值就是 0）。
   40% / 40.01% 两帧几乎重合，插值跨度≈0，否则箭头会从圆形中间扫过去 */
@keyframes send-fly {
  0% { transform: translateY(var(--fly-lift)); }
  40% { transform: translateY(-170%); }
  40.01% { transform: translateY(170%); }
  100% { transform: translateY(0); }
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
