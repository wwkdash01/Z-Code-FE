# ChatBoard 架构优化方案

## 现状诊断

当前 `ChatBoard.vue`（~320行）在一个组件内承担了过多职责：历史加载、分页、SSE 流式接收、消息管理、滚动控制、错误处理。同时存在以下几类问题：

| 问题类别 | 影响 | 严重程度 |
|---------|------|---------|
| 嵌套对象响应性靠 workaround 维持 | watch + 顶层引用，不可复用，有并发隐患 | 中 |
| SSE 逻辑与 useSSE.ts 重复 | 维护两套解析代码，易出现差异 | 高 |
| MessageRow 仅渲染纯文本 | 与 TestAiResponseCard 的 Markdown 体验不一致 | 中 |
| URL 硬编码在组件内 | 不同环境需改源码，不灵活 | 低 |
| refreshHistory 死代码 | ~50行无用逻辑占用文件空间 | 低 |
| scrollToBottom 无节流 | SSE 高频回调下每帧执行 requestAnimationFrame | 中 |
| crypto.randomUUID() 做 key | 每个消息生成 UUID，性能开销 | 低 |

---

## 优化方向

### 1. 用 shallowRef 替代 watch+引用 workaround（根因修复）

**问题**：直接修改 `ref<ChatMessage[]>` 内元素的属性时，Vue 的依赖追踪和 diff 有时无法可靠触发视图更新，导致我们不得不引入 `watch(streamingContent)` + `streamingAiMsg` 引用作为中介。

**方案**：将每个 ChatMessage 包装为 `shallowRef`，push 到数组后 Vue 能直接追踪其属性变更。

```typescript
// Before
const messages = ref<ChatMessage[]>([])
// push → watcher → streamingAiMsg.value.content = val

// After
import { ref, shallowRef } from 'vue'

interface ChatMessage {
  uid: string; sender: 'user' | 'ai'; content: string
  avatarUrl: string; renderState: 'history' | 'loading' | 'streaming' | 'done'
}

const messages = ref<ShallowRef<ChatMessage>[]>([])

messages.value.push(shallowRef({ ... }))
// SSE onmessage 直接操作
messages.value[last]?.value.content += chunk  // Vue 100% 可靠触发
```

**收益**：
- 移除 `watcher`、`streamingContent`（不再需要中介层）
- SSE onmessage 回调里直接写 `messages.last().content += parsed.d || ''`
- `onerror` / `finally` 分支大幅简化
- 零隐式耦合，可预测行为

---

### 2. 抽取 SSE 逻辑为通用 composable（DRY）

**问题**：ChatBoard 里的 fetchEventSource 逻辑（第 136-168 行）和 `src/composables/useSSE.ts` 几乎一模一样——同一套 JSON parse + 追加字符串 + credentials: include。唯一区别是写入目标不同（TestAiResponseCard 写入 aiResponse ref，ChatBoard 写入 messages 数组）。

**方案**：新建 `useStreaming.ts`，参数化写入目标：

```typescript
// src/composables/useStreaming.ts

export interface UseStreamingOptions {
  url: string
  onData?: (chunk: string) => void      // 每个 chunk 到达时的回调
  onComplete?: () => void                // 流结束
  onError?: (err: Error) => void        // 错误
}

export function useStreaming(options: UseStreamingOptions) {
  const isStreaming = ref(false)
  let abortController: AbortController | null = null

  async function startStream() {
    if (isStreaming.value) return
    isStreaming.value = true
    
    try {
      await fetchEventSource(options.url, {
        credentials: 'include',
        async onopen(res) {
          if (!res.ok) throw new Error(`SSE 连接失败：${res.status}`)
        },
        onmessage(event) {
          try {
            const parsed = JSON.parse(event.data)
            const text = parsed.d || parsed.data || parsed.content || ''
            options.onData?.(text)
          } catch {
            options.onData?.(event.data)
          }
        },
        onerror(err) {
          options.onError?.(err)
        },
      })
      options.onComplete?.()
    } catch (err) {
      options.onError?.(err as Error)
    } finally {
      isStreaming.value = false
    }
  }

  return { isStreaming, startStream }
}
```

**ChatBoard 使用示例：**

```typescript
const streamingMessages = ref<ShallowRef<ChatMessage>[]>([])
let currentAiMsgIndex = -1

function sendMessage() {
  // 1. push user message
  // 2. push AI placeholder, record index
  
  const url = `${import.meta.env.VITE_API_BASE}/api/apps/user/code-stream?appId=...&userPrompt=...`
  
  const { startStream } = useStreaming({
    url,
    onData: (chunk) => {
      if (currentAiMsgIndex >= 0) {
        streamingMessages.value[currentAiMsgIndex].value.content += chunk
      }
    },
    onComplete: () => {
      if (currentAiMsgIndex >= 0) {
        streamingMessages.value[currentAiMsgIndex].value.renderState = 'done'
      }
    },
    onError: (err) => {
      if (currentAiMsgIndex >= 0) {
        streamingMessages.value[currentAiMsgIndex].value.content = '[连接错误]'
        streamingMessages.value[currentAiMsgIndex].value.renderState = 'done'
      }
    },
  })
  
  startStream()
}
```

**收益**：
- ChatBoard.vue 瘦身至 ~120 行（减少 60%+）
- useSSE.ts + useStreaming.ts + ChatBoard 三处 SSE 逻辑统一
- 新增 SSE 消费端无需重写 fetchEventSource 模板代码

---

### 3. MessageRow 支持 Markdown 渲染

**问题**：右侧 TestAiResponseCard 用 `renderMarkdown` + `v-html` 渲染 Markdown，左侧 MessageRow 只显示纯文本。用户对比体验不一致。

**方案**：MessageRow 接受 `asMarkdown` prop，流式期间显示明文避免 HTML 未闭合闪烁：

```vue
<!-- MessageRow.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '@/utils/markdown'

const props = defineProps<{
  sender: 'user' | 'ai'
  content: string
  avatarUrl: string
  renderState?: 'history' | 'loading' | 'streaming' | 'done'
  asMarkdown?: boolean
}>()

const html = computed(() => props.asMarkdown && renderMarkdown(props.content))
</script>

<template>
  <div v-if="sender === 'ai' && renderState === 'streaming'" class="bb bub-stream">
    <!-- 流式阶段：明文显示，避免未闭合 HTML 导致布局闪烁 -->
    <span v-if="asMarkdown">{{ content }}</span>
    <!-- 非流式/纯文本：v-html 渲染 -->
    <span v-else-if="html" class="md-render" v-html="html"></span>
    <span v-else>{{ content }}<span class="t-cursor">|</span></span>
  </div>
</template>
```

ChatBoard 模板中传入 prop：

```html
<MessageRow
  v-for="msg in messages"
  :key="getMsgKey(msg)"
  :sender="msg.sender"
  :content="msg.content"
  :avatar-url="msg.avatarUrl"
  :render-state="msg.renderState"
  :as-markdown="msg.sender === 'ai'"
/>
```

**收益**：
- AI 回复支持代码块高亮、列表、链接等 Markdown 语法
- 流式阶段平滑过渡，不会因 HTML 片段不完整导致重排

---

### 4. API 配置外置

**问题**：ChatBoard.vue 第 133 行硬编码 `http://localhost:58080/api/apps/user/code-stream?...`，request.ts 第 38 行也硬编码了 baseURL。

**现状**：
```
src/request.ts : baseURL: 'http://localhost:58080/api'
ChatBoard.vue  : http://localhost:58080/api/apps/user/code-stream?...
```

**方案**：将 baseURL 抽到 `config/api.ts`，通过 import 使用：

```typescript
// src/config/api.ts
export const API_BASE = 'http://localhost:58080/api'
```

```typescript
// ChatBoard.vue 使用
import { API_BASE } from '@/config/api'
const url = `${API_BASE}/apps/user/code-stream?appId=${props.appId}&userPrompt=...`
```

长远看建议接入 `import.meta.env.VITE_API_BASE` 环境变量实现开发/生产分离，但当前项目以 Vite 为主，先抽常量即可。

**收益**：单点修改，所有消费者自动生效

---

### 5. 清理死代码

**refreshHistory**（第 172-219 行）：50 行逻辑从未被调用过，内部使用了复杂的 Set 去重 + 时间排序 + pop+push 模式，逻辑脆弱。

**决策**：删除。如需刷新功能应在后续需求中重新实现。

**收益**：文件缩短 ~30%，心智负担降低

---

### 6. 性能优化

#### 6a. scrollToBottom 节流

SSE 回调每秒可能触发 10-30 次 `scrollToBottom()`，每次调用 `requestAnimationFrame`。加一个简单 debounce：

```typescript
let scrollRafId = 0
function scrollToBottom() {
  cancelAnimationFrame(scrollRafId)
  scrollRafId = requestAnimationFrame(() => {
    const container = document.querySelector('.chat-board-content')
    if (container) container.scrollTop = container.scrollHeight
  })
}
```

**收益**：取消重复帧请求，减少主线程调度开销

#### 6b. 替换 key 策略

当前使用 `crypto.randomUUID()` 为每条消息生成 UUID 作为 v-for key，每次发送都创建两个新 UUID。改用 index 作为 key 更简单高效：

```html
<MessageRow
  v-for="(msg, idx) in messages"
  :key="idx"
  :index="idx"
  ...
/>
```

由于消息只会从尾部追加（用户消息）或头部插入（历史），index 作为 key 足够稳定。

**收益**：消除不必要的 BigInt 计算，DOM  diff 更高效

---

## 实施顺序

按依赖关系和优先级排列，建议分 3 步实施：

| 步骤 | 内容 | 预计改动文件数 |
|------|------|---------------|
| **Step 1** | shallowRef 替换 + scrollToBottom 节流 | ChatBoard.vue |
| **Step 2** | 抽 SSE composable + refreshHistory 清理 | useStreaming.ts（新）、ChatBoard.vue |
| **Step 3** | MessageRow Markdown 支持 + API 配置外置 | MessageRow.vue、api.ts（新）、ChatBoard.vue |

每一步完成后应独立编译通过且功能完整。
