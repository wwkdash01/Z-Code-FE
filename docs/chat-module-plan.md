# 聊天模块实现计划

## Context
TestPage.vue 需要实现完整的 AI 对话功能：游标分页加载历史消息（无限滚动），实时流式展示新消息（SSE）。现有基础代码包括 `ChatContainer.vue` / `MessageRow.vue` / `chat.css` 和 API 层。

## 涉及文件
- `src/components/Chat/ChatBoard.vue` — **新建**，核心父容器
- `src/components/Chat/MessageRow.vue` — **修改**，增加 renderState 状态支持
- `src/pages/test/TestPage.vue` — **修改**，嵌入 ChatBoard 组件
- `src/api/chatHistoryController.ts` — 已有，复用 `queryChatHistoryByCursor`
- `src/api/appController.ts` — 已有，复用 `getCodeGenStream`
- `src/styles/chat.css` — 已有，扩展样式

## 已确定的设计决策

| # | 决策 | 选择 |
|---|------|------|
| 1 | 消息数据结构 | 统一列表（单 `messages` ref），所有消息用 `crypto.randomUUID()` 作 v-for key，保证 Vue keyed diff 最小化重渲染 |
| 2 | 新消息渲染状态 | `renderState`: `history` / `loading` / `streaming` / `done`，控制 UI 表现 |
| 3 | 历史加载策略 | 倒序取最新一页 → unshift；加载更多用 cursor 取更老页 unshift |
| 4 | SSE 流式调用 | `fetch()` API 逐块读取 SSE |
| 5 | 组件拆分 | ChatBoard 为父容器（控制布局宽度），嵌入 TestPage |
| 6 | 发消息接口 | `getCodeGenStream` (GET, SSE)，后端自动落库 |

## 实施步骤

### Step 1: 改造 MessageRow.vue — 增加 renderState 支持
props 新增 `renderState?: 'history' | 'loading' | 'streaming' | 'done'`

- `history`: 纯文本渲染，无指示器
- `loading`: 打字指示器（三个跳动点），content 为空 *使用ant-design-vue的组件
- `streaming`: 已有 content + 尾部加载动画
- `done`: 完整内容渲染
- 用户消息忽略 renderState，始终直接渲染 content

### Step 2: 新建 ChatBoard.vue 主组件

**消息类型**:
```ts
interface ChatMessage {
  uid: number          // 自增唯一标识
  sender: 'user' | 'ai'
  content: string
  avatarUrl: string
  renderState: 'history' | 'loading' | 'streaming' | 'done'
}
```

**核心状态**:
```ts
const props = defineProps<{ appId: string }>()
const messages = ref<ChatMessage[]>([])
const userInput = ref('')
const isGenerating = ref(false)
const cursor = ref<string | undefined>(undefined)
const hasMore = ref(true)
let msgCounter = 0
const USER_AVATAR = '...'
const AI_AVATAR = '...'
```

**函数**:
1. `loadHistory()` — 调 `queryChatHistoryByCursor({ appId })`，records unshift 到头部，renderState 设为 `'history'`
2. `loadMoreHistory()` — 用当前 cursor 调同接口，unshift 更新
3. `sendMessage()` — 
   a. 校验非空 && !isGenerating
   b. push user 消息 `{ renderState: 'done', content: userInput.value }`
   c. push AI 占位 `{ renderState: 'loading', content: '' }`
   d. 清空输入框，`isGenerating = true`
   e. `fetch()` SSE 流 → 逐 chunk 拼接 → AI 消息改 `renderState: 'streaming'` 持续更新 content
   f. 流结束 → `renderState: 'done'`, `isGenerating = false`

**UI 布局**:
```
┌─────────────────────┐
│ [加载更多历史]       │ ← 顶部按钮，hasMore 控制显隐
├─────────────────────┤
│   chat-board        │ ← messages 列表滚动区域
├─────────────────────┤
│   user-prompt       │ ← textarea + 发送按钮
└─────────────────────┘
```

### Step 3: 嵌入 TestPage.vue
替换占位 div，引入 ChatBoard 传入 appId。

### Step 4: 清理或保留 ChatContainer.vue
此组件是之前 props 驱动模式，不再使用。

## 验证方式
1. 打开 TestPage 正常渲染
2. 加载更多测试历史分页
3. 发送消息观察 flow: user即时显示 → AI三点 → 流式更新 → 稳定渲染
4. 生成中再次发送应被禁用
5. Network 面板 SSE Content-Type 为 text/event-stream
