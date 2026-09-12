# 聊天历史「加载更多」全列表重渲染 — 问题分析与修复方案

> **状态：** 全部已定（Q1–Q7）。**尚未改动任何源码**，本文档为实施依据。

---

## Context

`ChatBoard` 的历史消息采用「游标分页 + 顶部『加载更多历史』按钮」加载。当前实现每次点「加载更多」，都会把**整个已渲染的消息列表全部重渲染一遍**，并把视口强行拽回底部。

这是应用编辑页（`/app/app-edit`）的高频路径：从「我的作品 / 精选应用」卡片点进来（带 `view=1`）会先加载第一页历史，用户往上翻旧消息时问题就暴露。

问题由 `f626b94` 引入——该提交把 `:key="msg.uid"` 换成了 `:key="idx"`：

```
-        v-for="msg in messages"
-        :key="msg.uid"
+        v-for="(msg, idx) in messages"
+        :key="idx"
```

提交信息声称是「消除 `crypto.randomUUID()` BigInt 开销」，但这个前提站不住脚：`uid` 本就在 `appendRecords` / `sendMessage` 里无条件生成（`ChatBoard.vue:105`、`:165`、`:176`），不再作为 key 使用并不能省掉这笔开销。**这次「优化」是净损失**——它引入了一个违背 Vue key 语义的用法（下标 key + 头部插入），然后在下游组件 `MessageRow` 里为它写了兜底补丁。

目标：恢复行身份，让「加载更多」只挂载新增的 k 行；并把「插入后怎么滚」的策略从共用函数里拆出来，归还给各调用方。

---

## 一、当前问题

| 现象 | 影响 |
|---|---|
| 点「加载更多历史」后，**所有可见消息行全部重渲染** | 大列表下点击卡顿、DOM 文本节点被批量改写 |
| 已渲染过的 AI 消息**重跑 markdown 解析** | `buildBlocks` + `tokenizeInline` 被无谓重算 |
| 加载旧消息后**视口被拽到底部** | 用户正在读的旧消息位置丢失，「加载更多」失去意义 |

---

## 二、根因分析

### 2.1 直接原因：下标 key + 头部插入

`ChatBoard.vue:252` 用下标作 key，而 `appendRecords` 用 `unshift` 往**数组头部**插入旧消息（`ChatBoard.vue:104`）。两者组合让 key → 消息的映射整体错位。

假设当前 `[A, B, C]`（keys `0/1/2`），加载更多时头部插入 2 条旧消息，数组变为 `[O1, O2, A, B, C]`（keys `0..4`）：

| key | 旧 vnode | 新 vnode | Vue 行为 |
|---|---|---|---|
| 0 | A | O1 | 复用实例，props 全变 → **重渲染** |
| 1 | B | O2 | 复用实例，props 全变 → **重渲染** |
| 2 | C | A | 复用实例，props 全变 → **重渲染** |
| 3 | — | B | **新挂载** |
| 4 | — | C | **新挂载** |

关键点：**没有任何一行保持身份**。key 命中的实例被喂进了另一条消息（props 差异触发 `shouldUpdateComponent` → 子组件重渲染），而原来的 A/B/C 内容则落到新 key 上重新挂载。净效果 = 可见的每一行 DOM 都被改写，等价于全列表重渲染。

> `MessageRow.vue:101` 的注释早已承认这个缺陷：
> ```js
> // uid 变了说明组件实例被复用给了另一条消息（v-for 用 index 作 key，头插历史时会错位）
> ```
> `MessageRow.vue:105` 的 `state.uid !== props.uid` 判断就是为此打的补丁：实例被复用到别条消息时，强制丢弃解析缓存重头解析。

### 2.2 触发路径

```
点击「加载更多历史」(ChatBoard.vue:237-245)
  → loadMore()  (ChatBoard.vue:142-156)
      → fetchMessages({ appId, cursor })  → GET /chatHistories/user/cursor
      → appendRecords(data.records)  (ChatBoard.vue:102-114)
          → records.forEach(r => messages.value.unshift(...))   ← k 次头部插入
          → scrollToBottom()                                     ← 拽到底部
      → cursor = data.nextCursor
      → hasMore = data.hasMore ?? true
```

### 2.3 渲染队列视角：四个场景逐一对照

**基础机制**

`messages` 是 `ref<ChatMessage[]>`。`unshift` / `push` 会触发数组的 `length` 与索引 setter → 触发该 ref 的依赖 → 组件的 render effect 经 `queueJob` 入队。`queueJob` 按 job id 去重，同一 tick 内 n 次同步变更只入队一次，于是**一个 flush 里渲染函数只跑一次**，产出一棵新 vnode 树，再由 `patchKeyedChildren` 与旧树按 key 做 diff。

所以决定开销的不是「改了几次」，而是「**变更发生在数组的哪个位置**」：

- 改**尾部**（`push`）：已有元素的下标不变 → 它们的 key 不变 → diff 只需处理新增；
- 改**头部**（`unshift`）：所有已有元素下标 +n → 下标 key 整体错位 → 整个列表重新配对。

这正是问题只在「加载更多」暴露的原因——其余路径都只动尾部。

**场景对照**

| # | 场景 | 变更操作 | 变更位置 | 队列 | 下标 key（现状） | uid key（Fix 1 后） |
|---|---|---|---|---|---|---|
| 1 | 首次加载历史 | `unshift` × n | 空列表 | 1 flush | mount n 行 | mount n 行（相同） |
| 2 | **加载更多** | `unshift` × k | **头部** | 1 flush | **n+k 行全部产出渲染** | **仅 mount k 行** |
| 3 | 发送消息 | `push` × 2 | 尾部 | 1 flush | mount 2 行 | mount 2 行（相同） |
| 4 | 流式输出 | `content +=`（非数组操作） | 尾部单元素 | 1 flush/chunk | 重渲染 1 行 | 重渲染 1 行（相同） |

逐个展开：

**场景 1 · 首次加载**（`loadHistory`，`ChatBoard.vue:124-140`）

数组 `[] → [M1..Mn]`。旧树为空，无论 key 取什么都要全量 mount n 行，两种情况无差异。

**场景 2 · 加载更多**（`loadMore`，`ChatBoard.vue:142-156`）—— **问题现场**

数组 `[M1..Mn] → [O1..Ok, M1..Mn]`。

- **下标 key**：旧 keys `0..n-1` 与新 keys `0..n+k-1` 中 `0..n-1` 命中 → 这些实例被复用，但 props 已被换成 `O1..O(n)` 或错位内容 → 全部触发重渲染；而 `M1..Mn` 落到新 key 上 → 重新 mount。净产出 **n+k 行**的渲染工作，旧实例的解析缓存全部作废。
- **uid key**：`O1..Ok` 是新 key → mount k 行；`M1..Mn` 的 key 与 props 都没变 → `shouldUpdateComponent` 返回 false → 跳过。净产出 **k 行**。

Fix 1 的全部收益就是 **k vs n+k**。

**场景 3 · 发送消息**（`sendMessage`，`ChatBoard.vue:164-184`）

数组 `[...] → [..., U, A]`（2 次 `push`）。已有下标不变，新增 key `n`、`n+1` → mount 2 行。下标 key 与 uid key 表现一致。

**场景 4 · 流式输出**（`ChatBoard.vue:199-203`）

不是数组操作，是 `aiMsg.content += chunk` 触发单个 message 对象的属性 setter，同样排队 → 1 次 flush。只有最后一行的 props 变 → 只重渲染那一行。下标 key 与 uid key 表现一致。

**结论**：`f626b94` 把 key 换成下标，只在「加载更多」这一条路径上产生全量重渲染；其余路径都动尾部，所以换 key 没有暴露问题——这大概率就是它没被及时发现的原因。

### 2.4 次生成本

- **markdown 重解析**：历史消息 `renderState = 'history'` → `isStreaming` 为 false → `blocks` computed（`MessageRow.vue:164-169`）对每条 AI 消息完整跑 `buildBlocks` + `tokenizeInline`。被错位重渲染的 AI 行等于白解析一遍。
- **解析缓存是实例私有的，但实例会被跨消息复用**：`MessageRow.vue:98` 的 `let state` 位于 `<script setup>` 内部（该块从第 1 行到第 177 行；`<script setup>` 的全部顶层代码编译进 `setup()`，每个实例执行一次），所以 `v-for` 出来的每一行各跑一遍 `setup()`，本来就各有各的缓存。真正的问题是：下标 key 会让**同一个实例被复用给另一条消息**，此时实例私有的缓存里存的是上一条的解析进度。`MessageRow.vue:101-110` 的 `state.uid !== props.uid` 判断就是为此而设——发现实例被换绑了就整体丢弃重建。

  （初稿此处误称 `state` 是「模块级全局变量、被所有实例共享」，与代码不符，已更正。）

---

## 三、视觉状态模型

### 3.1 两个正交维度

| 维度 | 载体 | 取值 | 决定什么 |
|---|---|---|---|
| **A. 内容生命周期** | `renderState` | `history` 直接出现 / `loading` 三点跳动 / `streaming` 光标 + spinner / `done` 定格 | 气泡**内部**渲染成什么样 |
| **B. 入场动效** | `entering` | `true` → 播 0.33s 渐显 / `false` → 不播 | 整**行**要不要播入场 |

关键在于 B 与 A **正交**，可以任意组合：

- 用户消息 = `done` + `entering`
- AI 占位 = `loading` + `entering`（延迟 0.225s）
- 历史消息 = `history` + 不 entering

所以「直接出现 / 流式跟随 / 渐显」**不是一维上的三个兄弟**，前两者是维度 A 的取值，第三者独占维度 B。

另外需要澄清归类：「流式跟随」里的「跟随」是**视口策略**（见 4.2），不属于动画层。剥掉它之后，流式真正的动画只有光标闪烁（`MessageRow.vue:342-350`）和代码块未闭合时的 `a-spin`（`MessageRow.vue:199-202`），都是元素级、由 `renderState` 驱动。

### 3.2 为什么不抽动画接口

1. **没有多态**：维度 A 的取值互斥且穷举，不存在「同一能力换一种实现」的需求。接口的价值来自可替换的实现，这里没有第二个实现。
2. **只有一个消费方**：全部落在 `MessageRow` 一个组件里，由数据声明式驱动，动画本身交给 CSS 引擎执行（`MessageRow.vue:347-350`、`:370-388`）。
3. **抽象边界已经存在**：就是 `ChatMessage` 上的 `sender` + `renderState` + `entering`。要动就动这三个字段本身，而不是在它们外面再包一层。

### 3.3 设计约束：入场动效不得改变 layout

入场动效只允许使用 `opacity` / `transform` 这类**不参与布局**的属性。

**Why：** `transform` / `opacity` 不触发回流，`scrollHeight` 在动画期间保持稳定，4.2 中 `'preserve'` 策略的「按 `scrollHeight` 差值补偿」才成立。若改用 `height` / `max-height` 做渐显，补偿会算错，视口仍会漂。

现有 `msg-fade-in` 用的正是 `opacity` + `translateY`（`MessageRow.vue:379-388`），符合约束。**这一条是未来扩展的前置条件，改动入场动效时必须守住。**

### 3.4 未来扩展：让「首次加载 / 加载历史」也渐显 —— ✅ 已定：本次不做

**决定：** 入场动效保持由单一 `entering: boolean` 控制，**不引入按行错峰 / 延迟值**，因此 `MessageRow` 的动画接口无需任何改动。以下分析保留作为未来参考。

**可行性与代价：** 插入点唯一——`appendRecords` 里给每行带上 `entering`：

```ts
function appendRecords(records: API.ChatHistoryVO[]) {
  records.forEach((r) => messages.value.unshift({
    ...,
    entering: true,          // 新增：让历史行也播入场
  }))
}
```

`MessageRow` **零改动**——维度 B 与 A 正交，类名落在根元素上（`ChatBoard.vue:259-263`），组件内部不需要知道这行是历史还是新发。

但要从「能用」到「优雅」，需先解决三件事：

| # | 问题 | 处理 |
|---|---|---|
| 1 | n 行**同时**播 = 整块闪一下，不是渐显 | `entering` 从 `boolean` 泛化为可带延迟（如 `enterDelay?: number`），按批内下标错峰并设上界（如 `Math.min(i, 8) * 40ms`），否则 n 大时末行要等很久。此时 `MessageRow` 需接收一个延迟值，不再零改动 |
| 2 | 动效若改变 layout 会污染 `'preserve'` 补偿 | 见 3.3 约束，只用 `opacity` / `transform` |
| 3 | 批量 `animationend` → n 次父组件重渲染（错峰时分散成 n 次 flush） | 可接受；若要更省，可把 `entering` 清零改成不经响应式的 DOM 直写 |

另有一个**现成隐患**必须先补：`ChatBoard.vue:263` 的 `@animationend="msg.entering = false"` **没有 `e.target === e.currentTarget` 守卫**，子元素（如 `a-spin`）的 `animationend` 冒泡上来会提前清掉标记。同文件 `:81-85` 的 `endPop` 已写了该守卫，应对齐。

补充：若将来加 `prefers-reduced-motion` 禁用动画，`animationend` 不再触发，`entering` 会永久留真（视觉上无碍，因为 fill-mode 为 `both`），但需要一个兜底把标记清掉。

---

## 四、修复方案

### 4.1 Fix 1 · 恢复行身份 —— ✅ 已定（Q1 = A）

`ChatBoard.vue:252`：

```diff
-        v-for="(msg, idx) in messages"
-        :key="idx"
+        v-for="msg in messages"
+        :key="msg.uid"
```

`uid` 已是每条消息的唯一标识（`ChatBoard.vue:105`、`:165`、`:176` 的 `crypto.randomUUID()`），直接复用，不引入新标识。

⚠️ 这等于**回滚 `f626b94`**。回滚安全：该提交并未真正省下 `crypto.randomUUID()`（uid 照旧生成），只是换掉了 key。

### 4.2 Fix 2 · 视口策略 —— ✅ 已定（Q2 = 本方案）

**核心**：`appendRecords` 退化为纯插入，不再碰 `scrollTop`；「插入后怎么滚」由各调用方声明。

```ts
type ViewportPolicy = 'bottom' | 'preserve' | 'follow'
```

| 调用点 | 策略 | 含义 |
|---|---|---|
| `loadHistory`（首次加载） | `'bottom'` | 无条件滚到底。因为 `unshift` 后消息在容器顶部，新挂载的容器 `scrollTop` 从 0 开始，不主动滚用户看到的是**最旧**一条 |
| `loadMore`（加载历史） | `'preserve'` | 按 `scrollHeight` 差值补偿，视口保持在原处 |
| `sendMessage`（发送消息） | `'bottom'` | 无条件滚到底——用户刚发出消息，期望看到它和随后的回复。这保留了原有行为（改动前 `ChatBoard.vue:196` 本来就有一次 `scrollToBottom()`） |
| `onData`（流式追加） | `'follow'` | **条件跟随**：仅当用户贴底时才跟，否则用户往上翻会被每个 chunk 拽回底部 |

（初稿称「发送消息不参与本策略」与代码不符——改动前那次 `scrollToBottom()` 的行为必须保留，只是改由同一套 API 表达。）

**实现要点**

```ts
const scroller = ref<HTMLElement | null>(null)   // 模板 ref，顺带替换 :226 的 document.querySelector
let scrollRafId = 0
const pinnedToBottom = ref(true)                 // 由滚动事件维护，见下方第 2 点

function onScrollerScroll() {
  const el = scroller.value
  if (!el) return
  pinnedToBottom.value = el.scrollTop + el.clientHeight >= el.scrollHeight - BOTTOM_EPS
}

/** 仅 'preserve' 需要：变更前记高度 */
function captureHeight() { return scroller.value?.scrollHeight ?? 0 }

function applyViewport(policy: ViewportPolicy, heightBefore = 0) {
  cancelAnimationFrame(scrollRafId)              // 保留 rAF 合并：流式每帧多个 chunk 时只写一次
  scrollRafId = requestAnimationFrame(() => {
    const el = scroller.value
    if (!el) return
    if (policy === 'bottom') el.scrollTop = el.scrollHeight
    else if (policy === 'preserve') el.scrollTop += el.scrollHeight - heightBefore
    else if (pinnedToBottom.value) el.scrollTop = el.scrollHeight
  })
}
```

模板上挂 `@scroll.passive="onScrollerScroll"`。调用点：`loadHistory` → `applyViewport('bottom')`；`loadMore` → `applyViewport('preserve', captureHeight())`；`sendMessage` → `applyViewport('bottom')`；流式 `onData` → `applyViewport('follow')`。

两个细节：

- **保留 `requestAnimationFrame` 而非改用 `nextTick()`**：rAF 天然晚于 microtask（Vue 的 DOM patch 在 microtask 内完成），既保证读到 patch 后的新高度，又能把流式每帧内的多个 chunk 合并成一次 `scrollTop` 写入。改成 `nextTick` 会失去合并能力。
- **`'follow'` 的「是否贴底」不能用「变更前现算」**（初稿的 `captureViewport()` 两步法，实施时自检推翻）：同一帧内到达第二个 chunk 时，第一个 chunk 的 rAF 还没执行、而 DOM 已经长高，此时现算会得出「用户已离开底部」，导致自动跟随在流式刚开始就中断。改为由容器滚动事件维护 `pinnedToBottom`——它反映用户真实位置，不受程序自身待执行的补偿影响。用户手动上翻 → 事件置假 → 跟随停止；翻回底部 → 置真 → 跟随恢复。

原 Q4 的 4-c（`document.querySelector` 全局查询会命中错误容器）被本方案吸收解决。

**边界观察（本次未处理）**：`loadMore` 用 `'preserve'`，但「加载更多历史」按钮位于滚动区**之外**的固定 header（`ChatBoard.vue:288` 起），所以用户停在底部时也能点到它；此时 `'preserve'` 会把视口锚在原地，视口随之离开底部。若希望「在底部时点加载更多仍停在底部」，可改为按 `pinnedToBottom` 分派：为真走 `'bottom'`，否则走 `'preserve'`。

### 4.3 Fix 3 · 删除已失效的 uid 守卫 —— ✅ 已定（Q3 = A）

`MessageRow.vue:101-110` 中 `state.uid !== props.uid` 这半个判断，存在的理由是「实例会被复用给另一条消息」（见 `:101` 的注释）。Fix 1 把身份改成稳定编号后，一个实例永远只对应一条消息，该分支**永不成立**。

删除它，并同步删掉那条解释「已不存在的场景」的注释。同段里「内容变短 / 样本被改写」的两个判断必须保留——它们防的是出错时内容被整体替换（`ChatBoard.vue:212`）。

- 收益：代码不再解释一个不存在的场景。行为不变——首次调用时该分支虽然会命中一次，但重置结果与初始空状态完全相同（`newState` 产出的就是空状态）。
- 成本：无。删一个恒假分支，行为可静态推出。
- 说明：初稿此处写「把 `state` 与 `buildBlocks` 从模块作用域移进 `<script setup>`」并称「需额外回归流式渲染」，两处都不成立——它本来就在 `<script setup>` 内，那是个空操作。详见 Q3。

### 4.4 收敛项（可选，与上述修复正交）

**4-1. 把 `(sender, renderState)` 的散乱 `v-if` 链收成一个 `mode` computed**

模板当前这样分派：

```
MessageRow.vue:189   v-if="sender === 'ai' && renderState === 'loading'"   → 三点
MessageRow.vue:195   v-else-if="sender === 'ai'"                          → 块渲染
MessageRow.vue:223   v-else                                               → 用户消息
```

而 `blocks` 在非 AI 时恒为空（`MessageRow.vue:165` 直接 `return []`）。收一个 `mode: 'user' | 'ai-pending' | 'ai-streaming' | 'ai-static'` 出来，模板从条件链变 switch，`isStreaming` 也无需单独判断。收益是**可读性**，不是解耦。

**4-2. 给 `entering` 的清除补 target 守卫**（见 3.4 的现成隐患）

```
ChatBoard.vue:263   @animationend="msg.entering = false"   ← 需加 e.target === e.currentTarget
```

---

## 五、待确认问题

### Q3. 是否清理掉已失效的 uid 守卫 —— ✅ 已定（A）

**先纠正初稿的一处错误：`state` 本来就是实例私有的，不存在「移到 `<script setup>`」这个改动。**

`MessageRow.vue:98` 的 `let state` 就在 `<script setup>` 内部（该块从第 1 行到第 177 行），而 `<script setup>` 的全部顶层代码会被编译进 `setup()`、每个组件实例执行一次——`v-for` 出来的每一行各自跑一遍 `setup()`，因此本来就各有各的解析缓存。初稿称它是「模块级全局变量、被所有实例共享」，与代码不符，2.4 节已同步更正。

**接下来澄清缓存的真实用途**——它与「组件是否重渲染」无关：

| 概念 | 历史行 | 流式行 |
|---|---|---|
| 组件 render 函数重跑 | Fix 1 后：**否**（key 不变、props 不变） | 每个 chunk：**是** |
| `blocks` computed 重算 | 挂载时 1 次，之后否 | 每个 chunk：1 次 |
| 需要解析缓存 | **不需要**（只算一次） | **需要** |

流式行为什么必须缓存：`content += chunk` 会让 `props.content` 变成**新的完整字符串** → `blocks` 失效重算 → 跑 `buildBlocks(props.content, …)`。注意 Vue 每次交来的是**全量内容**，不是增量——所以「只有一个组件在重算」并不等于「每次重算很便宜」。

- **无缓存**（`state` 每次被重置）：`buildBlocks` 里 `content.slice(state.scanned = 0, complete)` 会把整条内容拷贝一次，`split('\n')` 再逐行遍历一遍 → 每个 chunk 都是 O(L)。c 个 chunk 累计 **O(c × L)**（≈ O(L²/k)，k 为每 chunk 平均字数）。
- **有缓存**：只处理「上次扫描位置之后的完整行」→ 每个字符总共只被扫描一次，总计 **O(L)**。

量化对照（8,000 字回复，每 chunk 16 字 → c = 500）：无缓存累计约 **200 万字**扫描，外加 500 次全长字符串拷贝与 `split`；有缓存 **8,000 字**。约 250 倍差距，且随回复变长呈平方级放大。

（补充：流式期间 `tokenizeInline` 并不参与——`parts` 被置为 `[]`（`MessageRow.vue:166-167`），只在流结束后的那一次重算里才跑。所以重复成本全部落在 `buildBlocks` 的全文扫描上。）

所以缓存是流式打字机的性能支点，不是多余的——只是它服务的是流式行，不是历史行。

**`state.uid` 那半个判断，才是下标 key 下的补偿。** 原作者面对的是「同一个实例会被复用给另一条消息」——实例私有的缓存此时存着上一条的进度。为了能发现这件事，才在缓存里记了一个「归属编号」，比对不上就整体丢弃重建。

**Fix 1 之后，那个判断就永久失效了。**

Fix 1 把身份换成稳定编号后，一个实例永远只对应一条消息，归属编号与当前消息编号再也不可能不等 → `MessageRow.vue:101-110` 的第一个分支变成**恒假**。

但同一段里的另外两个判断要留：

| 分支 | 防的是什么 | Fix 1 之后 |
|---|---|---|
| 归属编号比对 | 实例被换绑给另一条消息 | **恒假 → 可删** |
| 长度变短 | 内容被整体替换 | 仍需要 |
| 样本比对 | 等长但内容被改写 | 仍需要 |

（后两者都对应 `ChatBoard.vue:212` 的 onError 把内容换成错误提示。）

**删掉恒假分支是行为不变的。** 首次调用时它虽然会命中一次，但重置产出的状态与初始空状态完全相同（`newState` 产出的就是空状态）；此后编号恒定，永不再命中。

| 选项 | 权衡 |
|---|---|
| **A —— ✅ 已定** | 删掉归属编号分支与那条注释。收益：代码不再解释一个已不存在的场景——这正是「更规范」的来源。风险接近于零，行为可静态推出 |
| B | 保留现状。多一段永不执行的判断，外加一条会误导读者的注释（它描述的是下标 key 时代的问题，而那个时代已经过去） |

> 关于「重新验证打字机」：初稿要求「额外回归流式渲染」，那是基于「要动作用域」这个错误前提。真正的改动只是删一个恒假分支，不需要跑起来才能确认。

### Q4. 次要问题处理清单 —— ✅ 已定

| 编号 | 问题 | 位置 | 决定 |
|---|---|---|---|
| 4-d | 4.4 的两条收敛项（`mode` computed、`animationend` 守卫） | `MessageRow.vue:189-223` / `ChatBoard.vue:263` | **✅ 做** |
| 4-a | `loadMore` 的 `!cursor.value` 守卫，后端返回 `hasMore:true` 但 `nextCursor` 为空时会成为死按钮 | `ChatBoard.vue:143` | **✅ 排除**——后端保证两者同步 |
| 4-b | `hasMore` 初值 `true`，首屏加载完成前按钮就已显示 | `ChatBoard.vue:87` | **✅ 做**——初值改 `false` |
| ~~4-c~~ | ~~`scrollToBottom` 用 `document.querySelector` 全局查询~~ | — | 已被 4.2 吸收 |

**4-b 的机制说明**

`hasMore` 初值为 `true`（`ChatBoard.vue:87`），所以组件**第一帧就渲染出按钮**（模板 `v-if="hasMore"`，`:238`）。而首屏数据是**异步**取的——`onMounted`（`:116`）里 `await loadHistory()` 发起 HTTP 请求，响应返回后才把 `hasMore` 写成后端给的值（`:135`）。

因此第 1 帧与「数据到位」之间**隔着一次网络往返**。这期间画面上是「空列表 + 一个孤零零的『加载更多历史』按钮」；数据到达后若 `hasMore` 为 false（历史不足一页），按钮消失、头部高度变化、下方内容跳一下。

附带效应：若用户在第 1 帧手快点它，`loadMore()` 的 `!cursor.value` 守卫（`:143`）会直接 return——表现为「点了没反应」。症状与 4-a 相同但成因不同（这里是首屏窗口期，不是后端契约）。

**修法**：初值改 `false`（一处字面量），按钮只在后端明确表示「还有更多」之后才出现。**✅ 已定：照此修。**

### Q6. 验证口径 —— ✅ 已定（A）

起 `npm run dev` 实测：进历史较多的应用，验证「加载更多」的重渲染、滚动保位、流式跟随条件；并在 Vue DevTools 中确认旧行未被重新渲染。另跑 `npx vue-tsc --noEmit`。

### Q7. 提交方式 —— ✅ 已定（A）

新建一个提交，如 `perf(chatboard): 历史消息改回 uid key，视口策略按来源分派`，不动 `f626b94` 的历史。

---

## 六、涉及文件

| 文件 | 操作 | 说明 |
|---|---|---|
| `docs/chatboard-history-rerender.md` | **新建** | 本文档 |
| `src/components/Chat/ChatBoard.vue` | **修改** | Fix 1（`:252` key）、Fix 2（`appendRecords` 纯插入 + `captureViewport`/`applyViewport` + 模板 ref）、4-b（`:87` 初值）、4-2（`:263` 补守卫） |
| `src/components/Chat/MessageRow.vue` | **修改** | Fix 3（删恒假的归属编号分支）、4-1（`mode` computed） |

复用而非新增：`uid`（`ChatBoard.vue:105` 等）已现成，无需引入新标识；`ChatMessage.renderState` 机制不变。

---

## 七、验证方式

**准备**：`npm run dev`，进入历史较多的应用 `/app/app-edit?id=<appId>&view=1`。

**功能验证**

1. 点「加载更多历史」，历史消息正确追加到列表顶部，顺序正确；
2. AI 消息的代码围栏仍渲染为状态行（「代码编辑完毕！」），内联 markdown（加粗 / 斜体 / 行内码 / 链接）正常；
3. 加载前后**视口停在原处**（对比修复前会直接沉底）；
4. **流式跟随条件生效**：AI 流式输出时若用户往上翻，视口不再被每个 chunk 拽回底部；若停在底部则正常跟随。

**重渲染验证（关键）**

5. 打开 Vue DevTools 组件面板，选中某条**旧** AI 消息的 `MessageRow`；
6. 点「加载更多历史」，确认该组件**未被重新渲染**，只有新增的 `MessageRow` 挂载。

**回归验证**

7. 创建流：首页新建应用 → 跳转后自动发送初始提示词 → SSE 流式输出正常、结束后自动加载预览；
8. 打开已有应用时首次加载仍正确停在最新消息（`'bottom'` 策略）；
9. 查看他人作品（`view=1` 且非 owner）时输入区仍为遮罩锁定。

**静态检查**：`npx vue-tsc --noEmit`。

---

## 八、执行顺序

1. 备份 `ChatBoard.vue` 与 `MessageRow.vue`；
2. 应用 Fix 1 + Fix 2 + 4-b，跑通验证 1–9；
3. 应用 Fix 3（删恒假的归属编号分支）；
4. 应用 4.4 收敛项（`mode` computed、`animationend` 守卫）；
5. `npx vue-tsc --noEmit` + `npm run dev` 实测；
6. 按全局规范唤起 IDEA diff 审查，等确认后再新建提交。
