# 代码生成 SSE 接口：后端改动说明 + 前端适配方案

> 来源：后端 `wwk_z_code` 对 `getCodeGenStream` 异常处理的修复（2026-09-15）。
> 本文是前端侧的唯一契约说明 —— 后端改动已落地，**前端改造代码由你自己写**。

## 一、后端本次改了什么

`GET /api/apps/user/code-stream`（后端 `AppController#getCodeGenStream`）净改动四项：

| # | 改动 | 对前端的意义 |
|---|---|---|
| 1 | **修掉错误帧的 NPE**：原代码用 `Map.of(...)` 拼错误消息，而上游异常若没有 message（超时、取消、客户端断开等），`Map.of` 拒绝 null 值会抛 NPE，**把原始错误顶掉并直接断流** —— 前端只能看到"流莫名中断"。现已兜底（空则回退为「代码生成失败」），**错误帧保证发得出来** | `event: error` 从此可靠 |
| 2 | **流中途失败会落库**：新增一条 `messageType=error` 的聊天记录（`chat_history` 表），文案形如「代码生成失败：Read timed out」 | 刷新页面后能看到"有问有答（失败）"，不再是一条孤立的用户提问 |
| 3 | **`event: error` 帧的 `code` 恒为 `50001`** | 不要再指望在 SSE 帧里拿到 40100/40300 |
| 4 | **接口保留在 OpenAPI 文档中**（带帧协议说明），**改由前端生成前 hook 排除** | 接口在 Knife4j / `/v3/api-docs` 里可见可查（`content: text/event-stream`、`schema: string`、description 写明帧协议）；但生成管线要自己摘掉它 —— 见下方「生成管线排除」。**注意**：不摘的话会生成一个 axios 一次性调用的 `getCodeGenStream`，它拿不到流，是死代码 |
| 5 | **数据帧显式带事件名**：数据帧从「无 `event:` 行、靠 SSE 规范默认的 `message`」改为显式 `event:message` | 三类帧的事件名都显式可见，前端"按事件名分流"不再依赖规范默认值。**兼容性变更**：「无事件行」与 `event: message` 在规范上等价，`fetch-event-source` 也对每个 message 都触发 `onmessage`（不分事件名），所以现有解析逻辑不受影响 |

**另外评估过但最终否决的一项**（说明一下，免得你以后看到别的版本的设计对不上）：曾考虑把同步异常（未登录、无权限）也收敛成 SSE `event: error`，让接口对外只有一种形态。**否决了**，理由是流式接口的业界约定是：

- **流建立之前**失败 → 真实 HTTP 状态码 + JSON，**不要开始 SSE**（Anthropic/OpenAI 的 401/400/403/429/5xx 全是这个形态；A2A 项目甚至专门"先取第一个元素"，避免错误在 SSE 头已发出后才抛）
- **流建立之后**失败 → 状态码已固定 200 改不了，只能发 `event: error` 帧后终止

所以这个接口**对外本就是两种形态**，前端必须两种都处理 —— 这也正是下面方案的核心。

## 二、接口契约（当前真实行为）

| 情况 | 响应 | 前端应如何处理 |
|---|---|---|
| **正常流** | 200 + `text/event-stream`：若干 `event:message` + `data:{"d":"<chunk>"}` → `event:done`（data 为空串） | 追加内容；收到 `done` 收尾 |
| **未登录 / 非本人应用** | 全局异常处理器的 **JSON**：`{"code":40100,...}` / `{"code":40300,...}`（状态码仍是 200） | 按 `status` + `Content-Type` 分流；40100 跳登录 |
| **DTO 校验失败**（如缺 `appId`） | 内容协商决定：`Accept: */*` 时是 200 + JSON（`40000`）；`fetch-event-source` 会强制 `Accept: text/event-stream`，此时 JSON 写不出去 → **HTTP 400，body 为空** | `response.ok === false` 分支 |
| **流建立后失败** | 200 + `text/event-stream`：`event:error` + `data:{"code":50001,"message":"..."}`，**不发 `done`** | 解析事件名；展示失败提示并**保留已生成内容** |

> 关键点：三类帧的区分**只靠事件名**，不靠 JSON 字段形状。数据帧过去没有 `event:` 行（靠规范默认的 `message`），现已显式写出。

### 事件与错误码

| 事件 | data | 说明 |
|---|---|---|
| `message` | `{"d":"<chunk>"}` | 正文分片。2026-09-15 起**显式带事件名**，此前无 `event:` 行 |
| `done` | 空串 | 只有成功才发 |
| `error` | `{"code":50001,"message":"..."}` | **不套 `d` 包装**；code 恒为 50001 |

`40100` / `40300` / `40000` **不会**出现在 SSE 帧里 —— 它们只在"流建立前"的 JSON/HTTP 错误里，在 `onopen` 阶段处理。

## 三、前端现状的两个缺陷（要改的地方）

调用链：`src/components/Chat/ChatBoard.vue:280-306` → `src/composables/useStreaming.ts`（`@microsoft/fetch-event-source`，`credentials: 'include'`）。

### 缺陷 1：`event: error` 帧被静默吞掉（命中率最高）

`src/composables/useStreaming.ts:58-67` 的 `onmessage` 只看 `event.data`，**完全忽略 `event.event`**：

```ts
onmessage(event) {
  const parsed = JSON.parse(event.data)
  const text = parsed.d || parsed.data || parsed.content || ''   // error 帧 → 三个字段全 undefined
  options.onData?.(text)                                        // → 追加空串
}
```

`event: error` 的 data 是 `{"code":50001,"message":"..."}`，取 `d`/`data`/`content` 都是 `undefined` → 追加空字符串 → 流结束触发 `onclose` → `onComplete()`。

**结果：AI 上游失败时，用户看到一条空的 AI 回复，还被标记为"已完成"。**

### 缺陷 2：库自带的内容类型校验被顶掉

`node_modules/@microsoft/fetch-event-source/lib/esm/fetch.js:45` 是 `const onopen = inputOnOpen ?? defaultOnOpen`，而 `defaultOnOpen`（`:83-88`）本来就会校验 `content-type` 必须是 `text/event-stream`：

```js
function defaultOnOpen(response) {
  const contentType = response.headers.get('content-type');
  if (!contentType?.startsWith('text/event-stream')) {
    throw new Error(`Expected content-type to be ${EventStreamContentType}, Actual: ${contentType}`);
  }
}
```

但 `useStreaming.ts:52-56` 传了自定义 `onopen`（只判 `response.ok`），**库就不再用默认的了**，这层校验被绕过。目前因为库会强制 `Accept: text/event-stream`（`fetch.js:20-22`），非 2xx 恰好被 `response.ok` 拦下；一旦后端出现"200 + JSON"的形态，就会静默通过并被当成 SSE 消息解析。**别让一道保护依赖"碰巧成立"。**

## 四、改造方案

### F1 `src/composables/useStreaming.ts`

**(a) `onopen` —— 按 `Content-Type` 分流**

```ts
async onopen(response) {
  const ct = response.headers.get('content-type') || ''
  if (!response.ok || !ct.includes('text/event-stream')) {
    // 后端以 JSON 包装体返回错误（HTTP 可能仍是 200）
    const body = await response.json().catch(() => null)
    throw new FatalError(body?.message || `SSE 连接失败：${response.status}`)
  }
}
```

- 用 `FatalError`（库已导出）而非普通 `Error`：语义即"不重试"，比依赖 `onerror` 里 `throw err` 兜更清晰。落地前确认当前版本导出了它：`node_modules/@microsoft/fetch-event-source/lib/esm/index.js`
- `await response.json()` 会消费 body，但因抛错中断，库不会再读，安全
- 用 `ct.includes(...)` 而非 `startsWith`：后端可能返回 `text/event-stream;charset=UTF-8`
- 这里就能拿到 `body.code === 40100` → 可以顺手 `redirect2Login('请先登录后再使用')`

**(b) `onmessage` —— 按事件名分流**

```ts
onmessage(event) {
  if (event.event === 'error') {
    const { message } = JSON.parse(event.data || '{}')
    reportError(new Error(message || '代码生成失败'))
    return
  }
  if (event.event === 'done') {
    isStreaming.value = false
    options.onComplete?.()
    return
  }
  // 正常帧：event:message + data:{"d":"<chunk>"}
  // 这里作为兜底分支（非 error/done 的帧一律按数据帧解析），向前兼容以后新增的事件名
  const parsed = JSON.parse(event.data)
  options.onData?.(parsed.d ?? event.data)
}
```

**(c) `onclose` —— 加守卫**（现在无条件 `onComplete()`，报错后会再触发一次"完成"）

```ts
onclose() {
  if (reported || !isStreaming.value) return
  isStreaming.value = false
  options.onComplete?.()
}
```

**(d) `onerror` 保持不变**（`:74-81` 抛错以中断库的无限重试）—— 生成类接口重试等于重跑一次 AI，不要偷偷重跑。

### F2 `ChatBoard.vue` —— 保留半成品输出

`src/components/Chat/ChatBoard.vue:296-303` 现在是：

```ts
onError: (err) => {
  aiMsg.content = '[连接错误，请稍后重试]'   // ← 赋值，把已流出的内容整体覆盖了
  aiMsg.renderState = 'done'
  ...
}
```

业界流式实践明确要求"**保留部分响应并标记中断**"（用户已经看到的 token 不该凭空消失，重生成又要花一次额度）。建议改为追加而不是覆盖：

```ts
onError: (err) => {
  isGenerating.value = false
  aiMsg.content += aiMsg.content ? '\n\n⚠ 生成中断' : '[连接错误，请稍后重试]'
  aiMsg.renderState = 'done'
  message.error('AI 响应失败')
}
```

（`err.message` 现在能带出后端的具体原因，可以直接展示而不是固定文案。）

### F3 生成管线排除（需你落地）

接口现在**保留在文档里**，所以生成管线要主动把它摘掉，否则会生成一个拿不到流的 axios 调用。`@umijs/openapi` 提供 `hook.afterOpenApiDataInited`，可以在生成前改写 OpenAPI 数据 —— 在 `openapi2ts.config.ts` 里加 4 行即可：

```ts
// openapi2ts.config.ts
export default {
  requestLibPath: "import request from '@/request'",
  schemaPath: 'http://localhost:58080/api/v3/api-docs',
  serversPath: './src',
  hook: {
    // 流式接口无法用 OpenAPI schema 表达，且生成的 axios 调用拿不到流，
    // 故在生成前把该 path 摘掉（前端手写 SSE 客户端）
    afterOpenApiDataInited(openAPIData) {
      delete openAPIData.paths?.['/apps/user/code-stream']
      return openAPIData
    },
  },
}
```

加完重跑 `npm run openapi2ts`：`src/api/appController.ts` 的 `getCodeGenStream` 与 `typings.d.ts` 的 `ServerSentEventString` 会消失（后者把 `Flux<ServerSentEvent<String>>` 压成了 `Record<string, any>[]`，语义全丢且是死代码）。

SSE 的请求参数与事件类型手写，放进 `src/types/`（该目录本就是生成类型之上的手写补丁层，参考 `src/types/long-preserve.d.ts`），建议：

```ts
/** SSE 事件：正常分片 / 结束 / 错误 */
export type SseEvent =
  | { type: 'data'; chunk: string }
  | { type: 'done' }
  | { type: 'error'; code: number; message: string }
```

顺手清理无引用的 `src/composables/useSSEStream.ts`。

## 五、验证

1. 正常路径：DevTools Network 看该请求 `Content-Type` 是否为 `text/event-stream`，正文是否逐帧追加
2. 未登录调用：应走 `response.ok === false` 分支 → JSON 里 `code` 为 40100 → 跳登录（不是静默空白）
3. 流中途失败（临时改错后端上游 API Key）：UI 应显示失败提示 + **保留已生成内容**，不是"空回复已完成"
4. 用 curl 造 JSON 响应验证 onopen 兜底：
   ```bash
   # 缺 appId → 后端返回 JSON（DTO 校验失败）
   curl -i "http://localhost:58080/api/apps/user/code-stream?userPrompt=test"
   ```
5. 重跑 `npm run openapi2ts` 后 `git diff` 应只删除该接口相关内容，其他接口不受影响
