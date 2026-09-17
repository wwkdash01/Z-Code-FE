/**
 * 通用 SSE 流式请求工具，参数化写入目标（onData 回调）
 */
import { ref } from 'vue'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { redirect2Login } from '@/utils/auth'
import { useLoginUserStore } from '@/stores/loginUser'

/**
 * 失败发生的位置。
 *
 * 这个接口对外本来就是两种形态，光有 Error 不够用：
 *  - pre-stream ：请求没进流。后端返回 `application/json` 包装体（HTTP 可能仍是 200），
 *                 或网关/容器的错误响应。此时响应里一个字的内容都没有。
 *  - mid-stream ：流已建立（200 + text/event-stream），失败以 `event:error` 帧抵达。
 *                 此时气泡里可能已经有半截内容，调用方需要保留而不是清空。
 */
export type StreamErrorKind = 'pre-stream' | 'mid-stream'

/** SSE 失败。带 kind 是为了让调用方能按形态分别处理 */
export class StreamError extends Error {
  readonly kind: StreamErrorKind
  /** 后端错误码。pre-stream 取 JSON 包装体的 code；mid-stream 恒为 50001 */
  readonly code?: number

  constructor(kind: StreamErrorKind, message: string, code?: number) {
    super(message)
    this.name = 'StreamError'
    this.kind = kind
    this.code = code
  }
}

export interface UseStreamingOptions {
  /** Full URL with query params (appId, userPrompt) */
  url: string
  /** Called for each data chunk */
  onData?: (chunk: string) => void
  /** Called when stream completes successfully */
  onComplete?: () => void
  /** Called on connection error or network failure */
  onError?: (err: Error) => void
}

/**
 * 解析 `event:error` 帧的 data。
 *
 * ⚠️ message 的语义：后端把**失败前已累积的半成品输出**放在这里（失败原因只进后端日志），
 * 一个字都没生成时是空串。所以它**不能当错误文案展示** —— 那是生成出来的内容本身。
 * 保留在返回值里只是为了调试时能看到。
 *
 * 仍要扛得住脏数据：这里抛错会让失败原因变成一个无关的解析异常，反而盖掉真实错误。
 */
function parseErrorFrame(data: string): { code?: number; message: string } {
  try {
    const parsed = JSON.parse(data || '{}')
    return {
      code: typeof parsed?.code === 'number' ? parsed.code : undefined,
      message: parsed?.message || '代码生成失败',
    }
  } catch {
    return { message: '代码生成失败' }
  }
}

export function useStreaming(options: UseStreamingOptions) {
  const isStreaming = ref(false)
  const loginUserStore = useLoginUserStore()
  /**
   * onError 只能报一次。
   * onerror 里抛错中断重试后，fetch-event-source 会 reject 同一个错误，
   * 外层 catch 还会再捕到一次 —— 没有这个标记就会弹两条 message。
   */
  let reported = false
  /**
   * 流是否已经建立。
   * 用来给 onerror 里的错误定性 —— 建流**之后**才断的（断网、服务端断连），
   * 拿到的往往是原生 TypeError，身上没有 kind，不能当成「流前失败」。
   */
  let opened = false

  function reportError(err: Error) {
    isStreaming.value = false
    if (reported) return
    reported = true
    options.onError?.(err)
  }

  async function startStream() {
    if (isStreaming.value) return

    // Check auth before starting
    if (!loginUserStore.loginUser.id) {
      redirect2Login('请先登录后再使用')
      return
    }

    isStreaming.value = true
    reported = false
    opened = false

    try {
      await fetchEventSource(options.url, {
        credentials: 'include',
        /**
         * 必须自己声明 accept，不能让库兜底成 `text/event-stream`。
         *
         * 该接口声明了 `produces=text/event-stream`。「流建立前失败」要返回的 JSON
         * 包装体一旦没有任何 converter 能写出去，就退化成 406 + 空 body ——
         * 前端连 code(40100/40300/40000) 都读不到，只能显示一句无信息的连接失败。
         * 同时接受两者后：成功协商到 text/event-stream，失败协商到 application/json。
         *
         * 键名必须是小写 `accept`：库的兜底判断是 `if (!headers.accept)`（fetch.js:20-22），
         * 写成 `Accept` 它读不到，会再补一个 `accept`，请求里就出现两个头。
         */
        headers: { accept: 'text/event-stream, application/json' },

        async onopen(response) {
          const ct = response.headers.get('content-type') || ''
          if (response.ok && ct.includes('text/event-stream')) {
            opened = true
            return
          }

          // 走到这里说明请求根本没进入流：后端以 JSON 包装体返回错误（HTTP 可能仍是 200），
          // 或者网关/容器给了别的错误响应（body 未必是 JSON）。
          // await response.json() 会消费 body，但下面立刻抛错中断，库不会再读。
          const body = await response.json().catch(() => null)
          const code = typeof body?.code === 'number' ? body.code : undefined

          // 40100：会话已失效。沿用 src/request.ts 的口径直接跳登录
          // （同样补一道「已经在登录页就不再跳」的守卫，避免无意义刷新）。
          // 这里不返回，仍照常抛 StreamError —— 调用方据此结束本次流。
          if (code === 40100 && !window.location.pathname.includes('/user/login')) {
            redirect2Login('请先登录后再使用')
          }

          throw new StreamError('pre-stream', body?.message || `SSE 连接失败：${response.status}`, code)
        },

        onmessage(event) {
          // 三类帧只靠事件名区分，不看 JSON 字段形状
          if (event.event === 'error') {
            const { code, message } = parseErrorFrame(event.data)
            reportError(new StreamError('mid-stream', message, code))
            return
          }

          if (event.event === 'done') {
            isStreaming.value = false
            options.onComplete?.()
            return
          }

          // 数据帧：event:message + data:{"d":"<chunk>"}
          try {
            const parsed = JSON.parse(event.data)
            options.onData?.(parsed.d ?? event.data)
          } catch {
            // Non-JSON payload — pass raw string
            options.onData?.(event.data)
          }
        },

        onclose() {
          // 失败帧之后服务端仍会正常关闭流（Flux 正常 complete），
          // onclose 必然触发 —— 没有这道守卫就会在报错后再补一次「完成」。
          if (reported || !isStreaming.value) return
          isStreaming.value = false
          options.onComplete?.()
        },

        onerror(err) {
          // 流已经建立之后才断的，统一按「流中失败」上报。
          // 否则调用方会把它当成流前失败，把已经流出的半成品整体覆盖成固定文案 ——
          // 用户看到的就是「打了一半的字突然全没了」。
          reportError(opened ? new StreamError('mid-stream', '连接中断') : err)
          // fetch-event-source 默认无限重试（每秒一次、无次数上限），
          // 而它只在 onerror **抛错** 时才真正中断。
          // 这是生成类接口：重试一次就等于重新跑一次 AI 生成，
          // 连接一断就停掉、交给用户手动重发，不要偷偷重跑。
          throw err
        },
      })
      // fetchEventSource resolves after onclose, so onComplete already called above
    } catch (e) {
      reportError(e as Error)
    }
  }

  return { isStreaming, startStream }
}
