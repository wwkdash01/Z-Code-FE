<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import dayjs from 'dayjs'
import defaultAvatar from '@/assets/anno.png'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  ExclamationCircleFilled,
  WarningFilled,
} from '@ant-design/icons-vue'

const props = defineProps<{
  sender: 'user' | 'ai'
  content: string
  avatarUrl: string
  createTime?: string
  renderState?: 'history' | 'loading' | 'streaming' | 'done'
  /**
   * 失败类型，undefined = 正常消息。
   *  - pre-stream ：流建立前失败（JSON 形态），content 已被上游换成固定文案
   *  - mid-stream ：流建立后失败（error 事件），content 是已生成的部分内容
   * 有值即渲染重试按钮。
   */
  failed?: 'pre-stream' | 'mid-stream'
  /** 生成中禁止重试（同一个流不能并发发起） */
  retryDisabled?: boolean
  /**
   * 这一轮可以撤回：挂在**用户**消息上（撤回按钮出现在它的 msg-time 左侧）。
   * 由上游判定 —— 只有「失败待恢复」那一轮对应的用户消息才为 true。
   */
  retractable?: boolean
  /** 撤回请求进行中 / 只读等禁止操作 */
  retractDisabled?: boolean
  /** 正在播退场动画（撤回）。由上游在动画时长之后再真正移除 */
  leaving?: boolean
}>()

const emit = defineEmits<{ retry: []; retract: [] }>()

const avatarFailed = ref(false)

// ---------- 撤回退场 ----------
const root = ref<HTMLElement | null>(null)
/**
 * 退场时写进行内样式的几何值，分两步：
 *  1) t0：把量到的当前高度锁成具体值（flex 项高度是 auto，auto 没法参与过渡）；
 *  2) 渐隐播完：高度与负 margin **同一次写入**收到终态。
 *
 * 为什么第二步必须同一次写入：margin-top 若跟着 class 在 t0 就动，它会在渐隐期间
 * 先把两行各上提 16px —— 视觉上就是「先卡一下」，而且和收高度脱节成两段动作。
 * -16px 对应 .chat-board-content 的 gap: 16px，让行在终态对布局的贡献正好是 0，
 * 上游真正移除消息时才不会跳。
 */
const leaveStyle = ref<{ height: string; marginTop?: string } | undefined>(undefined)

watch(
  () => props.leaving,
  (leaving) => {
    if (!leaving) {
      leaveStyle.value = undefined
      return
    }
    const el = root.value
    if (!el) return

    // 只量、不在这里收：「收到 0」的时机交给渐隐播完（见 onLeaveFadeEnd），不靠 JS 猜帧。
    leaveStyle.value = { height: `${el.getBoundingClientRect().height}px` }
  },
)

/**
 * 渐隐播完 → 开始收空间（高度 + 抵消 gap 的负 margin）。
 *
 * 为什么把触发点挂在 animationend 上，而不是「量完等一帧（nextTick / 双 rAF）再收」：
 * 行内 px 起始值必须成为一次**已提交**的样式变更起点，后面的 0 才有插值区间 ——
 * nextTick 只是微任务，不保证浏览器排过版；双 rAF 虽然保证了，却把收空间整体推迟 1~2 帧，
 * 越过 ChatBoard 的 LEAVE_MS 移除时刻，末尾被截断成一次跳动。
 * animationend 则天然落在渐隐正片的终点上：起点早已提交，两个相位首尾相接
 * （渐隐 50% + 收空间 50% = --leave-ms，与上游的移除定时器同源）。
 * 代价：动画被禁用（如 prefers-reduced-motion）时收不起来，行会保持原高到被移除为止。
 */
function onLeaveFadeEnd(e: AnimationEvent) {
  // scoped 会给 keyframes 名加作用域后缀，故按前缀匹配；子元素冒泡上来的也要挡掉
  if (e.target !== e.currentTarget || !e.animationName.startsWith('msg-fade-out')) return
  if (props.leaving) leaveStyle.value = { height: '0px', marginTop: '-16px' }
}

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
  /** 末尾渐隐截断的那一段（见 CUT_FADE_CHARS） */
  fade?: boolean
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

/**
 * 中断处渐隐截断的字符数。
 * CSS 没有「只选中最后一行」的能力，所以按固定字符数取尾巴 ——
 * 这样无论前面怎么折行都成立，视觉就是「文字在中断处淡出」。
 */
const CUT_FADE_CHARS = 12

/**
 * 切出末尾要做渐隐的那一段。
 * 从后往前数 CUT_FADE_CHARS 个**非空白**字符：内容正好断在换行处时，
 * 若把空白也算进去，渐隐会落在看不见的换行上，等于没效果。
 */
function splitFadeTail(text: string): { head: string; tail: string } {
  let cut = text.length
  let counted = 0
  while (cut > 0 && counted < CUT_FADE_CHARS) {
    cut--
    if (!/\s/.test(text[cut])) counted++
  }
  if (counted === 0) return { head: text, tail: '' }
  return { head: text.slice(0, cut), tail: text.slice(cut) }
}

const blocks = computed<Block[]>(() => {
  if (mode.value === 'user') return []
  const streaming = isStreaming.value
  const built = buildBlocks(props.content, streaming)

  // 流中途失败 + 有半成品 + 气泡**以文字结尾** → 末尾渐隐 + 告警图标。
  // 以代码块结尾的情况不重复标记：那一段由 code-status 自己表达（「代码编辑异常！」）。
  const cutTail =
    props.failed === 'mid-stream' && !!props.content && built[built.length - 1]?.kind === 'text'

  return built.map((b, i) => {
    if (b.kind === 'code') return b
    if (streaming) return { ...b, parts: [] }
    if (!cutTail || i !== built.length - 1) return { ...b, parts: tokenizeInline(b.value) }

    const { head, tail } = splitFadeTail(b.value)
    const parts = tokenizeInline(head)
    if (tail) parts.push({ type: 'text', value: tail, fade: true })
    // 图标当作「最后一个 part」渲染，省掉一个单独的开关 computed
    parts.push({ type: 'cut-icon', value: '' })
    return { ...b, parts }
  })
})

/**
 * 流中途失败，但一个字都没流出来（上游在首个分片前就挂了）：
 * 没有半成品可展示，退回固定文案。
 * 放在这里而不是上游，是为了让「failed=mid-stream 且 content 非空 ⇒ 一定是真半成品」
 * 成为结构性保证 —— 渐隐截断的判定因此不需要额外标志位。
 */
const showPartialFallback = computed(() => props.failed === 'mid-stream' && !props.content)

/** 代码块未闭合时已经有「编辑中」的图标动画，不再叠一个文本光标 */
const showCursor = computed(() => {
  if (!isStreaming.value) return false
  const last = blocks.value[blocks.value.length - 1]
  return !(last && last.kind === 'code' && !last.closed)
})
</script>

<template>
  <div
    ref="root"
    class="msg-row"
    :class="['sender-' + sender, { 'is-leaving': leaving }]"
    :style="leaveStyle"
    @animationend="onLeaveFadeEnd"
  >
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
        <!-- 流中途失败但一个字都没流出来：没有半成品可展示，退回固定文案 -->
        <span v-if="showPartialFallback">生成中断，请重试</span>
        <template v-else>
          <template v-for="(blk, idx) in blocks" :key="idx">
            <span v-if="blk.kind === 'code'" class="code-status">
              <!-- 流中途失败且这个代码块没等到结束围栏 → 它就是被中断的那一个。
                   没有这一支它会掉进下面的 else，被显示成「代码编辑完毕！」 -->
              <template v-if="failed === 'mid-stream' && !blk.closed">
                <CloseCircleOutlined class="code-status-error" />
                <span>代码编辑异常！</span>
              </template>
              <template v-else-if="isStreaming && !blk.closed">
                <EditOutlined class="code-status-editing" />
                <span>正在编辑代码</span>
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
                <!-- 中断标记：跟在渐隐的那一段后面 -->
                <WarningFilled v-if="part.type === 'cut-icon'" class="cut-icon" />
                <strong v-else-if="part.type === 'strong'">{{ part.value }}</strong>
                <em v-else-if="part.type === 'em'">{{ part.value }}</em>
                <code v-else-if="part.type === 'code'" class="md-code">{{ part.value }}</code>
                <a v-else-if="part.type === 'link'" :href="part.href">{{ part.value }}</a>
                <span v-else :class="{ 'cut-fade': part.fade }">{{ part.value }}</span>
              </template>
            </span>
          </template>
          <span v-if="showCursor" class="t-cursor">|</span>
        </template>
      </div>
      <!-- User message -->
      <div v-else class="bb">{{ content }}</div>

      <!-- 时间戳与两个操作同一行：字号取齐 msg-time。
           撤回在左（挂在用户消息上）、重新生成在右（挂在失败的 AI 消息上） -->
      <div v-if="showTime || failed || retractable" class="msg-meta">
        <button
          v-if="retractable"
          type="button"
          class="action-btn"
          :disabled="retractDisabled"
          @click="emit('retract')"
        >
          <ExclamationCircleFilled />
          <span>撤回消息</span>
        </button>
        <span v-if="showTime" class="msg-time">{{ timeText }}</span>
        <!-- 点击由上游负责「删掉这条失败气泡 + 重发一次」 -->
        <button
          v-if="failed"
          type="button"
          class="action-btn"
          :disabled="retryDisabled"
          @click="emit('retry')"
        >
          <ExclamationCircleFilled />
          <span>重新生成</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.msg-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  /* 禁止收缩。`min-height: auto` 给 flex 项的自动最小尺寸只在 overflow: visible 时生效，
     而 .is-leaving 会挂上 overflow: hidden —— 那一刻自动最小尺寸退化为 0；
     .chat-board-content 又是「flex column + overflow-y: auto」且内容超高（负 free space），
     于是唯一可压缩的这一行会被 flex 直接压成 0 高，渐隐就播在一个被裁光的盒子里，
     肉眼表现为「直接消失」。注意别用 min-height: 0 去「修」，那正好是反的。 */
  flex: 0 0 auto;
}

/* ===== 撤回退场：与 .msg-enter 的渐显完全对镜 =====
   同 ease、位移反向 —— 渐显是从上方 6px 落下来，退场就是往下沉 6px 淡出。
   时长走 --leave-ms（由 ChatBoard 的 LEAVE_MS 继承下来）；
   这里的兜底值与 LEAVE_MS 保持一致，正常不会用到。
   起始高度与收空间的负 margin 都由 JS 写成行内值（见 leaveStyle）：
   高度必须先量成具体值（auto 没法参与过渡），-16px 用来抵消 .chat-board-content 的
   gap: 16px，让行在终态对布局的贡献正好是 0，上游真正移除时才不会跳。

   ★ 拆成两段，各占 50%（当前 LEAVE_MS = 240ms → 渐隐 0~120ms、收空间 120~240ms），
   衔接处是关键：
     1) 前 50%：只做渐隐，高度不动 —— 气泡完整可见，渐隐才看得见；
     2) 后 50%：才收高度与负 margin（由 onLeaveFadeEnd 触发）—— 此时气泡已透明，
        收空间看不出「压扁」，只表现为下方内容平滑上移。
   两段用不同缓动来消掉「淡完到起收」之间的空档：渐隐走 `ease`（前段快），约 100ms 就淡透；
   收空间走 `ease-in-out`（起步慢），120ms 起手时几乎还没动。于是整体读起来是一段连续动作，
   而不是「淡一下、停一下、再收」。
   若两段都设成 `ease`：渐隐 ~90ms 就淡透（后半段白等），而收空间一上来 30ms 就吃掉近一半高度 ——
   既留出空档，又在还看得见的时候裁气泡。
   比例写成百分比是为了让调整只发生在 LEAVE_MS 一处，两段的相对节奏不随它漂移。

   ★ 阶段 2 由渐隐的 animationend 触发（见 onLeaveFadeEnd），不是 transition 的 delay：
   delay 是相对「这次样式变更被提交的时刻」算的，而那个时刻要么不确定
   （nextTick 只是微任务，不保证已排版），要么被双 rAF 推迟 1~2 帧从而越过上游的移除时刻。
   挂在 animationend 上，相位边界由动画自己的时间轴给出，两段首尾相接、严丝合缝。

   ★ 还有一条前置条件：overflow: hidden 会让 flex 项的自动最小尺寸退化为 0，
   这一行就会被 .chat-board-content（flex column + 内容超高）直接压成 0 高 ——
   必须靠 .msg-row 上的 flex: 0 0 auto 兜住，否则渐隐播在被裁光的盒子里，肉眼就是「直接消失」。 */
.msg-row.is-leaving {
  overflow: hidden;
  pointer-events: none;
  animation: msg-fade-out calc(var(--leave-ms, 240ms) * 0.5) ease both;
  transition:
    height calc(var(--leave-ms, 240ms) * 0.5) ease-in-out,
    margin-top calc(var(--leave-ms, 240ms) * 0.5) ease-in-out;
}

@keyframes msg-fade-out {
  from {
    opacity: 1;
    transform: none;
  }
  to {
    opacity: 0;
    transform: translateY(6px);
  }
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
  color: var(--color-text);
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
  color: var(--color-text-tertiary);
}

.code-status :deep(.code-status-done) {
  color: var(--color-primary);
}

/* 流中途失败：用琥珀告警色。
   调色板里没有 danger 色，这里复用已有的 --color-accent-amber，
   而不是写死一个红色 —— scripts/check-tokens.mjs 会拦截硬编码色值 */
.code-status :deep(.code-status-error) {
  color: var(--color-accent-amber);
}

/* 中断处：末尾若干字符渐隐（CSS 无法只选中最后一行，所以按固定字符数取尾巴，
   字符数见 CUT_FADE_CHARS），紧跟一个告警图标。
   mask 里的 #000 只表示「此处可见」，不是配色，不参与换肤 */
.cut-fade {
  -webkit-mask-image: linear-gradient(90deg, #000, transparent);
  mask-image: linear-gradient(90deg, #000, transparent);
}

.cut-icon {
  margin-left: 4px;
  color: var(--color-accent-amber);
}

/* 编辑中：先绿/原色闪烁，再左右摇晃。color 经 currentColor 驱动 svg fill */
.code-status :deep(.code-status-editing) {
  animation: code-edit-hint 2.8s ease-in-out infinite;
}

/* color 与 transform 各自按自己出现的断点独立插值，互不干扰 */
@keyframes code-edit-hint {
  0%, 100% { color: var(--color-primary); transform: none; }
  10% { color: rgba(0, 0, 0, 0.45); }
  20% { color: var(--color-primary); }
  30% { color: rgba(0, 0, 0, 0.45); }
  40% { color: var(--color-primary); }
  55% { transform: rotate(0deg); }
  65% { transform: rotate(-16deg); }
  75% { transform: rotate(14deg); }
  85% { transform: rotate(-8deg); }
  95% { transform: rotate(0deg); }
}

.di-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-text-quaternary);
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
  color: var(--color-primary);
  animation: tblink 1s infinite;
}

@keyframes tblink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* User messages: teal, right-aligned, no avatar, bubble shrinks to content up to 80% */
.sender-user .bb {
  background-color: var(--color-primary);
  color: #fff;
  max-width: 80%;
}

/* ===== time + retry：同一行，字号一致 ===== */
.msg-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.msg-time {
  font-size: 11px;
  line-height: 1;
  color: var(--color-text-tertiary);
}

/* 轮次级操作（撤回消息 / 重新生成）：文字按钮，字号 / 行高与 msg-time 完全对齐，不抢视觉焦点 */
.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 0;
  border: none;
  background: none;
  color: var(--color-accent-amber);
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  transition: color 0.2s;
}

.action-btn:hover:not(:disabled) {
  color: var(--color-primary);
}

.action-btn:disabled {
  color: var(--color-text-disabled);
  cursor: not-allowed;
}
</style>
