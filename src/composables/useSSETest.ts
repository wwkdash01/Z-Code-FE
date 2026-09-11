import { ref } from 'vue'
import { redirect2Login } from '@/utils/auth'
import { useLoginUserStore } from '@/stores/loginUser'

/**
 * 手写 SSE 解析，替代 @microsoft/fetch-event-source
 * 接口与 useSSE 一致：{ aiResponse, isGenerating, error, fetchSSE }
 */
export function useSSETest() {
  const aiResponse = ref('')
  const isGenerating = ref(false)
  const error = ref<Error | null>(null)
  const loginUserStore = useLoginUserStore()

  async function fetchSSE(appId: number | string, userPrompt: string) {
    if (!loginUserStore.loginUser.id) {
      redirect2Login('请先登录后再使用')
      return
    }

    aiResponse.value = ''
    isGenerating.value = true
    error.value = null

    const url = `http://localhost:58080/api/apps/user/code-stream?appId=${appId}&userPrompt=${encodeURIComponent(userPrompt)}`

    try {
      console.log(`[${new Date().toLocaleTimeString()}] SSE 请求已建立`)
      const response = await fetch(url, {
        credentials: 'include',
        headers: { Accept: 'text/event-stream' },
      })

      console.log(`[${new Date().toLocaleTimeString()}] SSE 连接打开，状态：${response.status}`)

      if (!response.ok) {
        error.value = new Error(`SSE 连接失败：${response.status}`)
        isGenerating.value = false
        return
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk

        // 按行分割，处理完整 SSE 事件
        let newlineIdx: number
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIdx).trim()
          buffer = buffer.slice(newlineIdx + 1)

          // 跳过空行（事件分隔符）和 comment/id 等忽略的字段
          if (!line || line.startsWith(':') || line.startsWith('id:') || line.startsWith('event:') || line.startsWith('retry:')) continue

          // data 字段可能是多行的，以 id: 或 event: 等为分隔
          if (line.startsWith('data:')) {
            const data = line.slice(5) // 去掉 "data:" 前缀
            try {
              const parsed = JSON.parse(data)
              aiResponse.value += parsed.d || parsed.data || parsed.content || ''
            } catch {
              aiResponse.value += data
            }
          }
        }
      }

      isGenerating.value = false
      console.log(`[${new Date().toLocaleTimeString()}] SSE 流结束`)
    } catch (e) {
      isGenerating.value = false
      error.value = e as Error
      console.error(`[${new Date().toLocaleTimeString()}] SSE 异常`, e)
    }
  }

  return { aiResponse, isGenerating, error, fetchSSE }
}
