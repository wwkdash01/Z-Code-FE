/**
 * 通用 SSE 流式请求工具
 * 复用 @composables/useSSE 的解析逻辑，参数化写入目标（onData 回调）
 */
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { redirect2Login } from '@/utils/auth'
import { useLoginUserStore } from '@/stores/loginUser'

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

export function useStreaming(options: UseStreamingOptions) {
  const isStreaming = ref(false)
  const loginUserStore = useLoginUserStore()

  async function startStream() {
    if (isStreaming.value) return

    // Check auth before starting
    if (!loginUserStore.loginUser.id) {
      redirect2Login('请先登录后再使用')
      return
    }

    isStreaming.value = true

    try {
      await fetchEventSource(options.url, {
        credentials: 'include',
        async onopen(response) {
          if (!response.ok) {
            throw new Error(`SSE 连接失败：${response.status}`)
          }
        },

        onmessage(event) {
          try {
            const parsed = JSON.parse(event.data)
            const text = parsed.d || parsed.data || parsed.content || ''
            options.onData?.(text)
          } catch {
            // Non-JSON payload — pass raw string
            options.onData?.(event.data)
          }
        },

        onclose() {
          isStreaming.value = false
          options.onComplete?.()
        },

        onerror(err) {
          isStreaming.value = false
          options.onError?.(err)
        },
      })
      // fetchEventSource resolves after onclose, so onComplete already called above
    } catch (e) {
      isStreaming.value = false
      options.onError?.(e as Error)
    }
  }

  return { isStreaming, startStream }
}
