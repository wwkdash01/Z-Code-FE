<script setup lang="ts">
import { computed, ref } from 'vue'
import dayjs from 'dayjs'
import defaultAvatar from '@/assets/anno.png'
import { CheckCircleOutlined, EditOutlined } from '@ant-design/icons-vue'

const props = defineProps<{
  sender: 'user' | 'ai'
  content: string
  avatarUrl: string
  createTime?: string
  renderState?: 'history' | 'loading' | 'streaming' | 'done'
}>()

const avatarFailed = ref(false)

const timeText = computed(() => {
  const base = dayjs(props.createTime || undefined).format('M月D日 HH:mm')
  return props.sender === 'ai' ? `${base} | AIGC` : base
})

// ---------- 内联 markdown（轻量，纯内联元素，永不溢出）----------
// 支持：加粗(**)、斜体(*)、行内代码(`)、链接[text](url)
interface InlinePart {
  type: string
  value: string
  href?: string
}

function tokenizeInline(text: string): InlinePart[] {
  const parts: InlinePart[] = []
  // 每次新建带 g 的正则，避免 exec 的 lastIndex 跨调用残留
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[.*?\]\(.*?\))/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    const raw = match[0]
    const before = text.slice(lastIndex, match.index)
    if (before) parts.push({ type: 'text', value: before })
    if (raw.startsWith('**') && raw.endsWith('**')) {
      parts.push({ type: 'strong', value: raw.slice(2, -2) })
    } else if (raw.startsWith('*') && raw.endsWith('*')) {
      parts.push({ type: 'em', value: raw.slice(1, -1) })
    } else if (raw.startsWith('`') && raw.endsWith('`')) {
      parts.push({ type: 'code', value: raw.slice(1, -1) })
    } else if (raw.startsWith('[')) {
      const linkMatch = /\[(.*?)\]\((.*?)\)/.exec(raw)
      if (linkMatch) {
        parts.push({ type: 'link', value: linkMatch[1], href: linkMatch[2] })
      }
    }
    lastIndex = match.index + raw.length
  }
  const remaining = text.slice(lastIndex)
  if (remaining) parts.push({ type: 'text', value: remaining })
  return parts.length > 0 ? parts : [{ type: 'text', value: text }]
}

// ---------- 代码围栏切分 ----------
// 任何 ``` 围栏都不回显源码，换成一行状态。两条不变式：
//   1) 已渲染的内容只增不减——尾部若还只是围栏前缀（`、``），先扣留不渲染；
//   2) 只把「以换行收尾的完整行」写进缓存——最后一行可能还在长，判早了会回撤。
// SSE 只追加，所以已冻结的分类永不改变，缓存可跨渲染复用。

const FENCE_OPEN = /^[ \t]*`{3,}/
const FENCE_CLOSE = /^[ \t]*`{3,}[ \t]*$/
const PARTIAL_FENCE = /^[ \t]*`{1,2}$/
/** 缓存校验窗口：比对上次长度处的 8 个字符，识别内容被整体替换（如 onError 写入错误文案） */
const SAMPLE = 8

interface Block {
  kind: 'text' | 'code'
  /** 仅 text 用；code 块恒为空串 */
  value: string
  /** 仅 code 用：是否已收到结束围栏 */
  closed: boolean
  /** 仅 text 用：内联 markdown 片段（streaming 时为空数组，按纯文本渲染） */
  parts: InlinePart[]
}

interface ParseState {
  blocks: Block[]
  /** 已冻结到 content 的下标，恒为行首 */
  scanned: number
  inCode: boolean
  /** 上次解析时的长度，以及该长度之前的 8 字符样本 */
  len: number
  sample: string
}

function newState(): ParseState {
  return { blocks: [], scanned: 0, inCode: false, len: 0, sample: '' }
}

let state: ParseState = newState()

function buildBlocks(content: string, isStreaming: boolean): Block[] {
  const len = content.length
  const from = Math.max(0, state.len - SAMPLE)
  // 内容被整体替换（如 onError 写入错误文案）时丢弃缓存重建
  if (len < state.len || content.slice(from, state.len) !== state.sample) {
    state = newState()
  }

  // 只吃完整行。slice 以 \n 收尾，split 后最后一项是空串
  const complete = content.lastIndexOf('\n') + 1
  if (complete > state.scanned) {
    const lines = content.slice(state.scanned, complete).split('\n')
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i]
      if (state.inCode) {
        if (FENCE_CLOSE.test(line)) {
          state.inCode = false
          const open = state.blocks[state.blocks.length - 1]
          if (open.kind === 'code') open.closed = true
        }
      } else if (FENCE_OPEN.test(line)) {
        state.inCode = true
        state.blocks.push({ kind: 'code', value: '', closed: false, parts: [] })
      } else {
        const last = state.blocks[state.blocks.length - 1]
        if (last && last.kind === 'text') last.value += line + '\n'
        else state.blocks.push({ kind: 'text', value: line + '\n', closed: false, parts: [] })
      }
    }
    state.scanned = complete
  }

  const sampleFrom = Math.max(0, len - SAMPLE)
  state.len = len
  state.sample = content.slice(sampleFrom, len)

  // out 是缓存块的浅拷贝：尾部结论可能只是暂时的，不能写回缓存
  const out = state.blocks.slice()
  const tail = content.slice(state.scanned)
  if (!tail) return out

  if (state.inCode) {
    // 尾部是代码内容；若结束围栏已经收全，先把状态行切成「已完毕」
    if (FENCE_CLOSE.test(tail)) {
      out[out.length - 1] = { kind: 'code', value: '', closed: true, parts: [] }
    }
  } else if (isStreaming && PARTIAL_FENCE.test(tail)) {
    // 扣留：这一行目前只可能是围栏前缀，等第 3 个反引号到达再判定
  } else if (FENCE_OPEN.test(tail)) {
    out.push({ kind: 'code', value: '', closed: false, parts: [] })
  } else {
    const last = out[out.length - 1]
    if (last && last.kind === 'text') out[out.length - 1] = { ...last, value: last.value + tail }
    else out.push({ kind: 'text', value: tail, closed: false, parts: [] })
  }
  return out
}

type Mode = 'user' | 'ai-pending' | 'ai-streaming' | 'ai-static'

/** 渲染分派的唯一来源 */
const mode = computed<Mode>(() => {
  if (props.sender !== 'ai') return 'user'
  if (props.renderState === 'loading') return 'ai-pending'
  if (props.renderState === 'streaming') return 'ai-streaming'
  return 'ai-static'
})

const isStreaming = computed(() => mode.value === 'ai-streaming')

/** AI 回复要等流式结束才显示时间戳；用户消息和历史消息立即显示 */
const showTime = computed(() => mode.value === 'user' || mode.value === 'ai-static')

const blocks = computed<Block[]>(() => {
  if (mode.value === 'user') return []
  return buildBlocks(props.content, isStreaming.value).map((b) =>
    b.kind === 'code' ? b : { ...b, parts: isStreaming.value ? [] : tokenizeInline(b.value) },
  )
})

/** 代码块未闭合时已经有 spinner，不再叠一个文本光标 */
const showCursor = computed(() => {
  if (!isStreaming.value) return false
  const last = blocks.value[blocks.value.length - 1]
  return !(last && last.kind === 'code' && !last.closed)
})
</script>

<template>
  <div class="msg-row" :class="'sender-' + sender">
    <!-- AI avatar: 20px circle -->
    <div v-if="sender === 'ai'" class="ai-avatar">
      <img :src="avatarFailed || !avatarUrl ? defaultAvatar : avatarUrl" />
    </div>

    <!-- Bubble + time -->
    <div class="msg-main" :class="sender">
      <!-- AI loading: dots -->
      <div v-if="mode === 'ai-pending'" class="bb bub-loading">
        <span class="di-dot"></span>
        <span class="di-dot"></span>
        <span class="di-dot"></span>
      </div>
      <!-- AI streaming / done / history：围栏切成块，代码块只显示状态行 -->
      <div v-else-if="mode !== 'user'" class="bb">
        <template v-for="(blk, idx) in blocks" :key="idx">
          <span v-if="blk.kind === 'code'" class="code-status">
            <template v-if="isStreaming && !blk.closed">
              <EditOutlined />
              <span>正在编辑代码</span>
              <a-spin size="small" />
            </template>
            <template v-else>
              <CheckCircleOutlined class="code-status-done" />
              <span>代码编辑完毕！</span>
            </template>
          </span>
          <!-- streaming 时按纯文本渲染，避免半截内联 markdown 反复改写 -->
          <span v-else-if="isStreaming">{{ blk.value }}</span>
          <span v-else>
            <template v-for="(part, i) in blk.parts" :key="i">
              <strong v-if="part.type === 'strong'">{{ part.value }}</strong>
              <em v-else-if="part.type === 'em'">{{ part.value }}</em>
              <code v-else-if="part.type === 'code'" class="md-code">{{ part.value }}</code>
              <a v-else-if="part.type === 'link'" :href="part.href">{{ part.value }}</a>
              <span v-else>{{ part.value }}</span>
            </template>
          </span>
        </template>
        <span v-if="showCursor" class="t-cursor">|</span>
      </div>
      <!-- User message -->
      <div v-else class="bb">{{ content }}</div>

      <div v-if="showTime" class="msg-time">{{ timeText }}</div>
    </div>
  </div>
</template>

<style scoped>
.msg-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

/* ===== AI avatar: 16px circle ===== */
.ai-avatar {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  margin-top: 4px;
}

.ai-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

/* ===== main column: bubble + time ===== */
.msg-main {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.msg-main.user {
  align-items: flex-end;
}

.msg-main.ai {
  align-items: flex-start;
}

/* ===== the bubble itself ===== */
.bb {
  padding: 8px 10px 10px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  word-break: break-word;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  width: fit-content;
}

/* AI messages: 无卡片，文字直接落在 chat-board 背景上 */
.sender-ai .bb {
  background-color: transparent;
  /* 背景透明后阴影会留下一个浅色矩形轮廓，必须一并去掉 */
  box-shadow: none;
  padding-left: 0;
  color: rgba(0, 0, 0, 0.88);
  max-width: 100%;
}

.bb.bub-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
  width: fit-content;
  max-width: none;
}

/* 代码围栏状态行：块级元素，前后换行由它自己保证。
   不能只靠 .bb 的 pre-wrap——结束围栏那一行的换行符被当作行终止符吃掉了，
   紧随其后的文本块开头没有 \n，行内元素会贴在状态行后面。 */
.code-status {
  display: flex;
  align-items: center;
  gap: 4px;
  /* 与上下段落各留出 5px */
  margin: 5px 0;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.code-status :deep(.code-status-done) {
  color: #00b894;
}

/* a-spin 的圆点默认用 antd 主色（蓝），改成与用户气泡同色的绿 */
.code-status :deep(.ant-spin-dot-item) {
  background-color: #00b894;
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

.md-code {
  background-color: rgba(0, 0, 0, 0.06);
  border-radius: 3px;
  padding: 2px 4px;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 0.9em;
  color: #e83e8c;
}

.t-cursor {
  color: #00b894;
  animation: tblink 1s infinite;
}

@keyframes tblink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* User messages: teal, right-aligned, no avatar, bubble shrinks to content up to 80% */
.sender-user .bb {
  background-color: #00b894;
  color: #fff;
  max-width: 80%;
}

/* ===== time label ===== */
.msg-time {
  font-size: 11px;
  line-height: 1;
  color: rgba(0, 0, 0, 0.45);
}
</style>
