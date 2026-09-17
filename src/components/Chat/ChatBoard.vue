<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { useLoginUserStore } from '@/stores/loginUser'
import { message } from 'ant-design-vue'
import { Button as AButton } from 'ant-design-vue'
import { Textarea as ATextarea } from 'ant-design-vue'
import { queryChatHistoryByCursor, retractUserPrompt } from '@/api/chatHistoryController'
import MessageRow from './MessageRow.vue'
import annoImg from '@/assets/anno.png'
import annoAngImg from '@/assets/anno-ang.png'
import { API_BASE } from '@/config/api'
import { useStreaming, StreamError } from '@/composables/useStreaming'
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
  /** 该气泡对应的用户提示词，重试时复用（不再重复插一条用户消息） */
  prompt?: string
  /** 失败类型；有值即表示这是失败气泡，MessageRow 据此渲染异常态和重试按钮 */
  failed?: 'pre-stream' | 'mid-stream'
  /**
   * 该条在 chat_history 里的主键。
   * 只有从游标接口渲染出来的历史记录才有 —— 刚发出去的那条是本地占位对象，
   * 后端落库的 id 前端并不知道。撤回时据此决定「传 id」还是「让后端自己推断」。
   */
  messageId?: string
  /** 正在播退场动画（撤回）。播完才真正从队列里移除 */
  leaving?: boolean
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
const AI_AVATAR = annoAngImg

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

/**
 * 最新一条 AI 消息处于失败态 → 必须先重试才能继续。
 *
 * 敢只用「最后一条」判断，是因为失败之后 sendMessage 会被这里挡住、
 * 不会再插入新的用户消息，所以失败气泡恒在队尾。
 * 这同时也是后端「error 记录只可能落在最新位置」那条假设的前端侧保证。
 */
const hasPendingFailure = computed(() => {
  const last = messages.value[messages.value.length - 1]
  // 必须同时有 prompt 才算「待恢复」：没有提示词就重试不了，
  // 那时再封锁输入就会把用户彻底卡死（蒙版写着「请先恢复对话」，点重试却毫无反应）。
  // 所以这里的条件与 MessageRow 里 retry 按钮的可用条件保持一致。
  return !!last && last.sender === 'ai' && !!last.failed && !!last.prompt
})

/** 输入区是否被遮罩封住。只读（查看他人作品）与失败待恢复共用同一块遮罩 */
const promptLocked = computed(() => !!props.disabled || hasPendingFailure.value)

/** 遮罩文案。只读优先（沿用调用方给的 disabledTip） */
const promptLockText = computed(() => {
  if (props.disabled) return props.disabledTip ?? ''
  if (hasPendingFailure.value) return '请先恢复对话'
  return ''
})

/**
 * 「失败待恢复」那一轮对应的用户消息 uid —— 撤回按钮挂在它上面。
 * 失败气泡恒在队尾（新消息被 hasPendingFailure 挡住进不来），所以它就是倒数第二条。
 */
const retractableUserUid = computed(() => {
  if (!hasPendingFailure.value) return undefined
  const userMsg = messages.value[messages.value.length - 2]
  return userMsg?.sender === 'user' ? userMsg.uid : undefined
})

// 发送按钮可用性只看 textarea：只读场景由 prompt-card 遮罩拦截，不参与这里。
// 但失败待恢复必须算进来 —— 那时蒙版虽然盖着，回车是键盘事件，蒙版挡不住。
const sendDisabled = computed(
  () => !hasInput.value || isGenerating.value || hasPendingFailure.value,
)

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

/** 模式开关的一次性光晕：只在切换那一下播一次，颜色由 CSS 变量按新模式取 */
const switchGlowing = ref(false)

function triggerGlow() {
  // 先置 false、下一帧再置回，保证连续切换能重播动画（同 triggerPop）
  switchGlowing.value = false
  requestAnimationFrame(() => {
    switchGlowing.value = true
  })
}

function endGlow(e: AnimationEvent) {
  // 同 endPop：动画名带 scoped 后缀，且子元素的 animationend 也会冒泡上来，故按前缀过滤
  if (!e.animationName.startsWith('switch-glow')) return
  switchGlowing.value = false
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
/**
 * 分隔条「点亮 / 淡出」的时长。
 * 同时喂给 CSS 的 transition-duration 和 .is-dimmed 的 visibility，
 * 两处共用一个值才不会出现「还没淡完就被隐藏」的突变。
 */
const DIM_MS = 300
/**
 * 撤回时消息的退场时长。
 * 刻意比 `.msg-enter` 的渐显（`msg-fade-in 0.33s ease`）快一档：退场是用户主动取消，
 * 拖得比入场久反而更烦人；240ms 里两段各 120ms，渐隐看得清、收空间也不拖沓。
 * 与 MessageRow 里 `.msg-row.is-leaving` 共用一个值（经 CSS 变量 --leave-ms 传下去），
 * 这样「动画播完」和「真的从队列移除」是同一时刻。
 */
const LEAVE_MS = 240
const cursor = ref<string | undefined>(undefined)

/**
 * 每次真正呈现给用户的有效消息条数（首屏与「加载更多」同一口径）。
 * error 记录会被过滤掉，所以「请求条数」≠「呈现条数」—— 见 fillPending。
 */
const PAGE_TARGET = 10
/**
 * 单次游标请求的条数。后端是 `Math.min(pageSize, 30)`，所以直接取上限：
 * 页越大，「凑够 PAGE_TARGET 条有效消息」越可能一次请求就够
 *（页取小了反而要翻更多次，往返更贵）。多取的部分不浪费，见 pending。
 */
const CURSOR_PAGE_SIZE = 30
/**
 * 已取回但还没渲染的有效消息，时间正序（旧 → 新），恒比当前渲染窗口更旧。
 *
 * 它的存在就是为了让 CURSOR_PAGE_SIZE 敢取大：多取的那些在这里变成**预取**，
 * 下一次「加载更多」直接从尾部取，不必再发请求。
 * 用 ref 是因为「还能不能翻」要依赖它的长度（canLoadMore）。
 */
const pending = ref<ChatMessage[]>([])

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
/** 单条历史记录 → 渲染消息 */
function recordToMessage(r: API.ChatHistoryVO): ChatMessage {
  const isUser = r.messageType === 'user'
  return {
    uid: crypto.randomUUID(),
    sender: isUser ? 'user' : 'ai',
    content: r.message || '',
    avatarUrl: isUser ? USER_AVATAR.value : AI_AVATAR,
    createTime: r.createTime || new Date().toISOString(),
    renderState: 'history',
    // 带上主键：撤回接口要用（appId + chatHistoryId）
    messageId: r.id,
  }
}

/**
 * 一页记录 → 时间正序的消息数组。后端按 (createTime DESC, id DESC) 返回，所以要倒着走。
 *
 * error 与 retraction **都不渲染**：
 *  - error      ｜失败回合的墓碑。之前重试成功过的那些失败没必要留在历史里；
 *  - retraction ｜被撤回的那条 user 行 —— 后端是「就地把 messageType 改写」而成，
 *                 位置保留，所以它出现在原本 user 该在的地方。
 *
 * 唯一的例外是最新的一轮失败（records[0] 是 error）：那时它是「失败待恢复」的当前回合，
 * 必须渲染出提示和按钮，否则用户看到的是一句没人应答的提问。
 * 但前提是那一轮的**开场记录**是 user；若已是 retraction，说明撤回过，整轮都不渲染。
 */
function pageToMessages(
  records: API.ChatHistoryVO[],
  opts: { renderTailError: boolean },
): ChatMessage[] {
  const out: ChatMessage[] = []
  for (let i = records.length - 1; i >= 0; i--) {
    const t = records[i].messageType
    if (t === 'error' || t === 'retraction') continue
    out.push(recordToMessage(records[i]))
  }

  if (opts.renderTailError && records[0]?.messageType === 'error') {
    // 往回找本轮的开场记录 —— 必须「找到即停」，它要么是 user，要么是被撤回后的 retraction。
    // 不能只 find(user)：跳过 retraction 会一路配到**上一轮**的 user，
    // 结果既把已撤回的一轮又渲染出来，重试还会用上一轮的提示词。
    const opening = records
      .slice(1)
      .find((r) => r.messageType === 'user' || r.messageType === 'retraction')

    // 开场记录是 retraction（或整页都找不到）→ 本轮已撤回 / 无从定位，什么都不渲染
    if (opening?.messageType === 'user') {
      // error 记录的 message 就是**已生成的那部分内容**（失败原因只进日志）。
      // 一个字都没流出来时它是空串 —— 那句「生成中断，请重试」的兜底由 MessageRow 负责，
      // 这样「failed=mid-stream 且 content 非空 ⇒ 一定是真半成品」成为结构性保证，
      // 渐隐截断的判定就不需要再传标志位，实时和历史也不可能两边写歪。
      //
      // 也注意开场记录不一定是 records[1]：error 会连续堆积
      //（失败落一条、重试再失败又落一条），实测出现过 [error, error, user] 的序列。
      out.push({
        uid: crypto.randomUUID(),
        sender: 'ai',
        content: records[0].message || '',
        avatarUrl: AI_AVATAR,
        createTime: records[0].createTime || new Date().toISOString(),
        renderState: 'history',
        failed: 'mid-stream',
        prompt: opening.message || undefined,
      })
    }
  }

  return out
}

/**
 * 「创建应用流」：历史为空时把初始提示词自动作为第一条消息发出去。
 *
 * 必须响应式触发，不能只在 onMounted 里判一次：
 * AppEditPage 是 v-if="appId"，appId 一赋值本组件就挂载，
 * 但 initialPrompt / disabled 要等应用详情和登录用户都到位才成立，
 * 那一刻 app.value 仍是 null → initialPrompt 为 undefined、disabled 为 true。
 * 详情接口和历史接口是并发发出的、响应只差几毫秒，谁先回不确定，
 * 于是「历史先回」时挂载时那一次判定必然落空（实测：首页创建流 3 次里 1 次、
 * 直接开链接 5/5），而详情回来后又没有任何东西再触发它
 * → 现象就是「创建应用后初始提示词时而不发」。
 */
const historyEmptyConfirmed = ref(false)
/** 自动发送只允许成功触发一次 */
const autoSendDone = ref(false)

async function autoSendInitialPrompt() {
  if (autoSendDone.value || !historyEmptyConfirmed.value) return
  // disabled 要等「详情 + 登录用户」都到位才变 false，天然充当等待条件
  if (!props.initialPrompt || props.disabled) return
  // 已有历史（含刚加载出来的）绝不补发，避免重复生成
  if (messages.value.length > 0) return
  autoSendDone.value = true
  await sendMessage(props.initialPrompt, { animate: false })
}

onMounted(async () => {
  const historyCount = await loadHistory()
  // null = 历史没取到，此时不自动发送，宁可漏发也不要覆盖已有的历史
  if (historyCount === 0) historyEmptyConfirmed.value = true
  await autoSendInitialPrompt()
})

// initialPrompt / disabled 是异步到位的：后到时补一次触发
watch([() => props.initialPrompt, () => props.disabled], () => {
  autoSendInitialPrompt()
})

/** 还能不能往更早翻：后端还有更多，或者本地已经预取了一些 */
const canLoadMore = computed(() => hasMore.value || pending.value.length > 0)

/**
 * 翻页把 pending 补到至少 need 条有效消息。
 *
 * 为什么需要这一层：error 记录被过滤后，「一页返回多少条」≠「呈现多少条」。
 * 只翻一页可能只呈现一两条，看起来像坏了 —— 这里保证每次呈现都补到 PAGE_TARGET 条
 * （除非确实翻到底了）。因为 CURSOR_PAGE_SIZE 取了上限 30，绝大多数情况一次请求就够；
 * 多取的部分留在 pending，下一次「加载更多」直接从那里取，不必再请求。
 *
 * @returns 是否拿到了数据。false = 请求失败，调用方保持原状
 */
async function fillPending(need: number): Promise<boolean> {
  // 首次调用时 hasMore 还没被后端确认过（初值 false，好让分隔条一开始是暗的），
  // 所以第一轮无条件请求一次
  let mustFetch = true
  while (pending.value.length < need && (mustFetch || hasMore.value)) {
    mustFetch = false

    const data = await fetchMessages({
      appId: props.appId,
      pageSize: CURSOR_PAGE_SIZE,
      ...(cursor.value ? { cursor: cursor.value } : {}),
    })
    if (!data) return false

    const records = data.records || []
    cursor.value = data.nextCursor
    // 后端恒返回 hasMore，缺省只在异常响应里出现；这时取 false（宁可让分隔条变暗，
    // 也不要留一个点了没反应的按钮）
    hasMore.value = data.hasMore ?? false
    if (!records.length) break

    // 新取回的一页比 pending 里现有的都旧，所以接到前面（保持时间正序）。
    // tail-error 规则只对「全量里最新的那一条」生效，也就是第一次请求的第一条。
    const isFirstFetch = pending.value.length === 0 && messages.value.length === 0
    pending.value = pageToMessages(records, { renderTailError: isFirstFetch }).concat(pending.value)
  }
  return true
}

/** 从 pending 尾部取出至多 n 条（尾部 = 最接近当前渲染窗口的那批） */
function takePending(n: number): ChatMessage[] {
  return pending.value.splice(Math.max(0, pending.value.length - n))
}

async function loadHistory(): Promise<number | null> {
  try {
    const ok = await fillPending(PAGE_TARGET)
    // 请求失败（code != 200）不等于「没有历史」，不能当成 0，
    // 否则后端抖一下就会凭空补发一条重复消息
    if (!ok) return null
    messages.value.push(...takePending(PAGE_TARGET))
    applyViewport('bottom')
    return messages.value.length
  } catch {
    message.error('加载历史消息失败')
    return null
  }
}

async function loadMore() {
  if (loadingMore.value || !canLoadMore.value || isGenerating.value) return
  loadingMore.value = true
  try {
    const anchor = captureAnchor()
    // 后端可能几十毫秒就返回，这一步保证反馈动画至少播完；
    // 若请求更慢，则锁定一直持续到数据到位——正确性不依赖后端有多快。
    // pending 里已经够数时不会发请求，但仍走同一个等待，动画时长才一致。
    const [ok] = await Promise.all([
      fillPending(PAGE_TARGET),
      new Promise((resolve) => setTimeout(resolve, FEEDBACK_MS)),
    ])
    if (!ok) return
    messages.value.unshift(...takePending(PAGE_TARGET))
    applyViewport('preserve', anchor)
  } catch {
    message.error('加载更多失败')
  } finally {
    loadingMore.value = false
  }
}

// ---------- send message (SSE) ----------
/**
 * 真正发起一次 SSE 生成。
 *
 * 首次发送（sendMessage）与失败重试（retryMessage）都收敛到这里，
 * 两条路径的差别只在「谁创建 aiMsg」，流本身的处理完全一致。
 */
function runStream(aiMsg: ChatMessage, isRetry: boolean) {
  const prompt = aiMsg.prompt ?? ''

  isGenerating.value = true
  aiMsg.content = ''
  aiMsg.failed = undefined
  aiMsg.renderState = 'loading'

  // retry 是后端 DTO 的必填项（@NotNull），它决定「要不要再写一条用户提示词」：
  // 首次发送传 false，失败重试传 true —— 传错会让历史里出现重复提问，漏传则整个请求 40000。
  const url =
    `${API_BASE}/apps/user/code-stream` +
    `?appId=${props.appId}&userPrompt=${encodeURIComponent(prompt)}&retry=${isRetry}`

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
      // 两种失败的协议形态不同，处理也不同（见 useStreaming 的 StreamErrorKind）
      const kind = err instanceof StreamError ? err.kind : 'pre-stream'
      aiMsg.failed = kind
      aiMsg.renderState = 'done'

      if (kind === 'pre-stream') {
        // 流建立前失败：响应里一个字的内容都没有，整体换成固定文案
        aiMsg.content = '系统异常，请重试'
        message.error('系统异常，请重试')
      } else {
        // 流建立后失败：气泡里已经有半截内容，**原样保留、一个字都不覆盖**。
        // 半成品为空（一个字都没流出来）时，由 MessageRow 兜底显示固定文案。
        // 失败表现交给 MessageRow：被中断的代码块显示「代码编辑异常！」，
        // 文字结尾则做渐隐截断 + 告警图标；时间戳下方给重试 / 撤回按钮。
        //
        // 这里用固定文案，**不能拿 err.message** —— 错误帧的 message 后端放的是半成品内容
        //（失败原因只进后端日志），拿它当提示会弹出一段生成出来的 HTML。
        message.error('AI 响应失败')
      }

      applyViewport('follow')
    },
  })

  startStream()
}

/** 创建 AI 占位气泡并追加到消息队列。reactive 包装是为了让流式赋值能被稳定追踪 */
function createAiMessage(prompt: string) {
  const aiMsg = reactive<ChatMessage>({
    uid: crypto.randomUUID(),
    sender: 'ai',
    content: '',
    avatarUrl: AI_AVATAR,
    createTime: new Date().toISOString(),
    renderState: 'loading',
    entering: true,
    prompt,
  })
  messages.value.push(aiMsg)
  return aiMsg
}

async function sendMessage(textArg?: string, opts: { animate: boolean } = { animate: true }) {
  const text = (textArg ?? userInput.value).trim()
  // 失败待恢复时不允许发新消息：必须先重试，否则历史里会留下一条孤儿提问
  if (!text || isGenerating.value || props.disabled || hasPendingFailure.value) return

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

  // 2. Placeholder AI message
  const aiMsg = createAiMessage(text)

  userInput.value = ''
  sendingAnim.value = opts.animate
  applyViewport('bottom')

  // 3. SSE streaming via composable
  runStream(aiMsg, false)
}

/**
 * 失败重试。
 *
 * 语义：删掉失败的那条 AI 气泡，用同一段提示词重新发一次，新气泡追加到消息队列末尾。
 * 刻意不再插一条用户消息 —— 提示词已经在上一条 user 气泡里，重发一次就够了。
 */
function retryMessage(failedMsg: ChatMessage) {
  if (isGenerating.value || props.disabled) return
  const idx = messages.value.findIndex((m) => m.uid === failedMsg.uid)
  if (idx < 0 || !failedMsg.prompt) return

  // 先摘掉失败气泡，再 push 新占位，避免新的流式内容落进旧气泡
  messages.value.splice(idx, 1)
  const aiMsg = createAiMessage(failedMsg.prompt)

  applyViewport('follow')
  // isRetry=true：让后端跳过用户提示词落库，否则历史里会出现重复提问
  runStream(aiMsg, true)
}

/** 撤回请求进行中。后端是幂等的，但没必要连点两次 */
const retracting = ref(false)

/** 轮次级操作（重试 / 撤回）的禁用条件：生成中、只读、撤回请求进行中 */
const turnActionDisabled = computed(
  () => isGenerating.value || !!props.disabled || retracting.value,
)

/**
 * 撤回本轮：后端把这条 user 行就地改写成 retraction，整轮（提问 + 失败气泡）从对话里消失。
 *
 * 顺序很重要：**先等接口成功，再动渲染队列**。反过来的话接口失败但你本地已经删了，
 * 刷新之后那一轮又回来，前后端状态就不一致。
 */
async function retractTurn(userMsg: ChatMessage) {
  if (retracting.value || isGenerating.value || props.disabled) return
  const failedMsg = messages.value[messages.value.length - 1]
  retracting.value = true

  try {
    const res = await retractUserPrompt({
      appId: props.appId,
      // 只有历史记录才带主键；刚失败的那一轮是本地占位对象，
      // 不带 id，让后端按「最新一轮失败对话」自己推断
      ...(userMsg.messageId ? { chatHistoryId: userMsg.messageId } : {}),
    })
    if (Number(res.data.code) !== 200 || !res.data.data) {
      message.error(res.data.message || '撤回失败，请稍后重试')
      return
    }
  } catch (e) {
    console.error('[ChatBoard] retract failed:', e)
    message.error('撤回失败，请稍后重试')
    return
  } finally {
    retracting.value = false
  }

  // 不直接删：先让两条消息播退场动画（淡出 + 收起高度），播完再真正移除 ——
  // 否则下方内容会瞬间往上跳一下。
  // 用定时器而不是 transitionend：动画万一没播（元素不可见、降级）也必须能移除，
  // 时长与 CSS 共用 --leave-ms，所以不会出现「动画还没完就消失」。
  const leavingMsgs = [failedMsg, userMsg].filter((m): m is ChatMessage => !!m)
  leavingMsgs.forEach((m) => (m.leaving = true))
  applyViewport('follow')

  window.setTimeout(() => {
    for (const m of leavingMsgs) {
      const idx = messages.value.findIndex((x) => x.uid === m.uid)
      if (idx >= 0) messages.value.splice(idx, 1)
    }
    // 删完 hasPendingFailure 自动变 false，输入区蒙版随之消失 —— 不需要单独释放
    applyViewport('follow')
  }, LEAVE_MS)
}

// ---------- viewport (throttled via RAF cancel) ----------
type ViewportPolicy = 'bottom' | 'preserve' | 'follow'
/** 距底部 8px 以内视为贴底 */
const BOTTOM_EPS = 8
/**
 * 「已到顶」的触发范围：视口高度的 20%。
 *
 * 为什么用比例而不是固定像素：容器高度会随窗口变化（实测 900px 窗口下
 * 内容区 550px，窗口缩小后可能只有 300px 出头），固定值在不同尺寸下松紧不一。
 * 按比例换算，小窗口下触发区自动变窄，手感一致。
 *
 * 20% 换算成绝对值远比原先的固定 8px 宽松（550px 容器 → 110px），
 * 所以不必再额外设一个像素下限。
 */
const TOP_TRIGGER_RATIO = 0.2

const scroller = ref<HTMLElement | null>(null)
let scrollRafId = 0
/**
 * 用户当前是否贴底。只能由滚动事件维护：流式期间内容持续变高，
 * 若在每次变更前现算，同一帧内到达第二个 chunk 时会因为「上一次的滚动还没补上」而误判为已离开底部。
 */
const pinnedToBottom = ref(true)

/**
 * 是否处于「接近顶部」区间。控制「加载更多历史」分隔条是否点亮。
 * 与 pinnedToBottom 同理：只由滚动事件维护，避免内容变高时错误重算。
 */
const atScrollTop = ref(true)

function onScrollerScroll() {
  const el = scroller.value
  if (!el) return
  syncScrollState(el)
}

/**
 * 把两个滚动派生态从元素上重新读一遍。
 *
 * 为什么不只在 @scroll 里读：JS 主动改 scrollTop（applyViewport）和插入历史消息
 * （会连带原生滚动锚定补偿）都会改变滚动位置且**不一定触发 scroll 事件**，
 * 那时 atScrollTop / pinnedToBottom 就是陈旧的。凡是我们自己动过滚动位置，都要在这里同步一次。
 */
function syncScrollState(el: HTMLElement) {
  pinnedToBottom.value = el.scrollTop + el.clientHeight >= el.scrollHeight - BOTTOM_EPS
  atScrollTop.value = el.scrollTop <= el.clientHeight * TOP_TRIGGER_RATIO
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
    // 我们自己动过滚动位置：同步派生态，不等 scroll 事件（它不保证触发）
    syncScrollState(el)
  })
}

</script>

<template>
  <div class="chat-board-wrapper">
    <!-- Top: Load More History
         常驻占位（不随滚动挂载/卸载，避免内容区上下跳），只在滚到顶部时「点亮」。
         未点亮时用 visibility:hidden 连点击一起关掉。
         状态来自滚动容器 @scroll 维护的 atScrollTop（见 syncScrollState）。 -->
    <div class="chat-board-header" :style="{ '--dim-ms': DIM_MS + 'ms' }">
      <button
        type="button"
        class="load-more-divider"
        :class="{ 'is-dimmed': !(canLoadMore && (atScrollTop || loadingMore)), 'is-loading': loadingMore }"
        :style="{ '--feedback-ms': FEEDBACK_MS + 'ms' }"
        :disabled="isGenerating || !canLoadMore || loadingMore"
        @click="loadMore"
      >
        加载更多历史
      </button>
    </div>

    <!-- Middle: Messages -->
    <!-- --leave-ms 挂在容器上供 MessageRow 继承：退场时长与 JS 的 LEAVE_MS 同源 -->
    <div
      ref="scroller"
      class="chat-board-content"
      :style="{ '--leave-ms': LEAVE_MS + 'ms' }"
      @scroll.passive="onScrollerScroll"
    >
      <MessageRow
        v-for="msg in messages"
        :key="msg.uid"
        :sender="msg.sender"
        :content="msg.content"
        :avatar-url="msg.avatarUrl"
        :create-time="msg.createTime"
        :render-state="msg.renderState"
        :failed="msg.failed"
        :leaving="msg.leaving"
        :retry-disabled="turnActionDisabled || !msg.prompt || !!msg.leaving"
        :retractable="msg.uid === retractableUserUid"
        :retract-disabled="turnActionDisabled || !!msg.leaving"
        :class="{
          'msg-enter': msg.entering,
          'msg-enter-delayed': msg.entering && msg.sender === 'ai',
        }"
        @animationend="handleRowAnimationEnd($event, msg)"
        @retry="retryMessage(msg)"
        @retract="retractTurn(msg)"
      />
      <div v-if="!messages.length" class="empty-hint">暂无消息，开始对话吧</div>
    </div>

    <!-- Bottom: User Input -->
    <div class="user-prompt-area">
      <div class="prompt-card">
        <!-- div1: 无边框输入区，随内容向上扩张 -->
        <div class="prompt-input">
          <!-- 不回车发送：回车交还给 textarea 的默认行为（换行），发送只走右下角按钮 -->
          <ATextarea
            v-model:value="userInput"
            placeholder="一个点子就够了～"
            :bordered="false"
            :auto-size="{ minRows: 2, maxRows: 6 }"
            :disabled="disabled"
          />
        </div>

        <!-- div2: 左侧占位工具 / 右侧模式开关 + 发送。生成期间这三组一并封住（输入框仍可打字） -->
        <div class="prompt-toolbar">
          <div class="prompt-tools">
            <AButton
              v-for="(tool, idx) in promptTools"
              :key="tool.key"
              type="text"
              size="small"
              :disabled="isGenerating"
              :class="[`tool-${tool.key}`, { 'tool-tapped': poppingIdx === idx }]"
              @click="triggerPop(idx)"
              @animationend="endPop"
            >
              <template #icon><component :is="tool.icon" /></template>
              {{ tool.label }}
            </AButton>
          </div>

          <div class="prompt-actions">
            <!-- 包一层仅用于关掉 antd 点击水波纹（光晕）：不传 theme，其余 token 全继承 -->
            <a-config-provider :wave="{ disabled: true }">
              <a-switch
                v-model:checked="chatModeChecked"
                size="small"
                :disabled="isGenerating"
                :class="{ 'glow-pulse': switchGlowing }"
                @change="triggerGlow"
                @animationend="endGlow"
              >
                <template #checkedChildren><EditOutlined /></template>
                <template #unCheckedChildren><QuestionOutlined /></template>
              </a-switch>
            </a-config-provider>
            <button
              class="send-btn"
              :class="{
                'is-edit': chatMode === 'edit',
                'is-chat': chatMode === 'chat',
                /* 生成期间也走「不可发」暗色：此时允许打字，只看 hasInput 会让 disabled 的按钮显示成可点的饱和色 */
                'is-idle': !hasInput || isGenerating,
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

        <!-- 只读（查看他人作品）/ 失败待恢复：遮罩封住整卡。
             AI 生成期间不封卡——只由 sendDisabled 封住发送键 -->
        <div v-if="promptLocked" class="prompt-lock">{{ promptLockText }}</div>
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

/* 分隔条常驻占位：高度用 min-height 锁死，两种状态几何完全一致，内容区不上下跳。
   （早期版本是「挂载/卸载」或 `v-if`，都会让 header 塌陷 21px 导致内容位移） */
.chat-board-header {
  padding: 0 16px;
  min-height: 21px;
}

/* 「---- 查看更多 ----」式分隔条：两侧横线用 currentColor，随文字一起变灰变绿 */
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
  color: var(--color-text-tertiary);
  cursor: pointer;
  /* 颜色（hover 变品牌色）单独一条慢过渡；
     opacity（滚到顶的点亮/淡出）用 --dim-ms，与 .is-dimmed 的 visibility 共用同一个值，
     保证「淡出播完」和「真正隐藏并挡掉点击」在同一时刻发生 */
  transition: color 0.4s, opacity var(--dim-ms, 300ms);
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
  color: var(--color-primary);
}

.load-more-divider:disabled {
  cursor: not-allowed;
}

/* 未点亮（没滚到顶部，或已经没有更多历史）：
   保留占位：header 的 min-height 撑住这一行，几何不塌陷（实测滚动容器高度恒为 550px）。
   visibility:hidden 一并挡掉点击，不需要额外的 pointer-events。
   注意 visibility 是离散属性，**只有写在 transition-property 里才会被推迟**：
   过渡中它会取「目标值」，所以淡出方向要等 --dim-ms 播完才真正 hidden，
   淡入方向则立刻 visible。两处与 opacity 共用同一个 --dim-ms，
   保证「淡完」与「可隐藏」同时发生，不会中途被切掉。

   loadingMore 时强制点亮（见模板里的 || loadingMore）：加载中会走 'preserve'
   策略保住视图位置，scrollTop 一离开 0 就会判定为「未到顶」，
   若不特判，正在播的呼吸/收缩反馈会被 opacity:0 直接吞掉。 */
.load-more-divider.is-dimmed {
  transition: color 0.4s, opacity var(--dim-ms, 300ms), visibility var(--dim-ms, 300ms);
  visibility: hidden;
  opacity: 0;
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
  color: var(--color-text-tertiary);
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
  background: var(--color-surface-subtle);
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
  color: var(--color-text-tertiary);
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
  color: var(--color-text-secondary);
  transition: color 0.2s;
}

/* 悬停/按下：icon 与文字变绿，并去掉 antd 自带的背景变色。
   必须带 :not(:disabled)——:hover 对 disabled 元素照样命中，否则封住后悬停仍会变绿 */
.prompt-tools :deep(.ant-btn:not(:disabled):hover),
.prompt-tools :deep(.ant-btn:not(:disabled):active) {
  color: var(--color-primary);
  background: transparent;
}

/* 生成期间封住：antd 给的 disabled 颜色会被上面 .ant-btn 那条（特异性更高）盖掉，这里补回来 */
.prompt-tools :deep(.ant-btn:disabled) {
  color: var(--color-text-disabled);
  cursor: not-allowed;
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

/* 首尾帧也必须带 3D：写 none 会让合成层在动画首尾被回收，偏移会在点下去那一瞬回来 */
@keyframes tool-tap {
  0% {
    transform: translate3d(0, 0, 0);
  }
  45% {
    transform: translate3d(0, var(--tap-y, 0), 0) rotate(var(--tap-r, 0deg));
  }
  100% {
    transform: translate3d(0, 0, 0);
  }
}

/* 会用 transform 做动画的图标统一常驻合成层：否则动画一结束层被回收，图标回到父层
   按小数布局坐标重新取整，会横向跳 1px（表现为「静止偏右、动画期间正常」）。
   用真值 translate3d 而不是 will-change —— 后者只是提示，浏览器可在内存吃紧时撤掉提升 */
.prompt-tools :deep(.ant-btn .anticon) {
  transform: translate3d(0, 0, 0);
}

.prompt-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 开关底色与发送按钮的模式色保持一致；同一个色值同时是光晕色的唯一真值源（--glow-rgb） */
.prompt-actions :deep(.ant-switch.ant-switch-checked),
.prompt-actions :deep(.ant-switch.ant-switch-checked:hover) {
  background: var(--color-primary);
  --glow-rgb: var(--color-primary-rgb);
}

.prompt-actions :deep(.ant-switch:not(.ant-switch-checked)),
.prompt-actions :deep(.ant-switch:not(.ant-switch-checked):hover) {
  background: var(--color-neutral-strong);
  --glow-rgb: var(--color-neutral-strong-rgb);
}

/* 切换脉冲：向外扩散一圈后淡到透明。
   不能用 opacity 淡出——那会把开关根节点连同滑块、底色一起淡掉，所以改为插值 box-shadow 的 alpha */
.prompt-actions :deep(.ant-switch.glow-pulse) {
  animation: switch-glow 0.45s ease-out;
}

@keyframes switch-glow {
  0% {
    box-shadow: 0 0 0 0 rgba(var(--glow-rgb), 0.5);
  }
  100% {
    box-shadow: 0 0 0 4px rgba(var(--glow-rgb), 0);
  }
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
  background: var(--color-text-quaternary);
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
  /* 静止态也带 3D 变换：will-change 只是提示、浏览器可撤掉；translate3d 是实际值，必须建层 */
  transform: translate3d(0, 0, 0);
  transition: transform 0.2s ease-out;
}

/* :not(:disabled) 是必需的：发送期间按钮 disabled，悬停整体失效，
   飞行动画结束后图标才不会被悬停值再拽起来 */
.send-btn:not(:disabled):hover :deep(.anticon) {
  transform: translate3d(0, var(--fly-lift), 0);
}

/* 用户主动提交：箭头从抬起处向上飞出圆形，再从下方升回圆心 */
.send-btn.sending :deep(.anticon) {
  animation: send-fly 0.9s ease-in-out;
}

/* 0% 接住悬停终态；100% 回 0（发送后按钮 disabled，静止值就是 0）。
   40% / 40.01% 两帧几乎重合，插值跨度≈0，否则箭头会从圆形中间扫过去 */
@keyframes send-fly {
  0% { transform: translate3d(0, var(--fly-lift), 0); }
  40% { transform: translate3d(0, -170%, 0); }
  40.01% { transform: translate3d(0, 170%, 0); }
  100% { transform: translate3d(0, 0, 0); }
}

.send-btn.is-edit {
  background: var(--color-primary);
}

.send-btn.is-chat {
  background: var(--color-neutral-strong);
}

/* 无文本：在模式色基础上变暗，规则靠后覆盖上面的模式色 */
.send-btn.is-edit.is-idle {
  background: var(--color-primary-hover);
}

.send-btn.is-chat.is-idle {
  background: var(--color-text-quaternary);
}

.send-btn:disabled {
  cursor: not-allowed;
}
</style>
